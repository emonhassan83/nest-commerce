import path from 'path';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ObjectCannedACL,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getS3Config, s3Client } from '../../config/s3.config.js';
import { ApiError, httpStatus } from '../../common/errors/api-error.js';

export interface S3UploadFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size?: number;
  [key: string]: any;
}

export interface UploadManyItem {
  file: S3UploadFile;
  path: string;
  key?: string;
}

export interface S3UploadResult {
  url: string;
  key: string;
  path: string;
  fileSize: number;
}

/** Public URL for an uploaded object (Hetzner, MinIO, or AWS S3). */
export const getPublicFileUrl = (key: string): string => {
  const { bucket, region, endpoint, publicUrl, forcePathStyle } = getS3Config();
  if (publicUrl) return `${publicUrl}/${key}`;
  if (endpoint) {
    return forcePathStyle
      ? `https://${endpoint}/${bucket}/${key}`
      : `https://${bucket}.${endpoint}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const aclOption = (): { ACL?: ObjectCannedACL } => {
  const { objectAcl } = getS3Config();
  return objectAcl && objectAcl !== 'none' ? { ACL: objectAcl as ObjectCannedACL } : {};
};

const describeError = (error: any): string =>
  [error?.name || error?.Code, error?.message].filter(Boolean).join(': ') || 'Unknown error';

/**
 * Upload a single file to AWS S3 bucket.
 */
export const uploadToS3 = async ({
  file,
  fileName,
}: {
  file: S3UploadFile;
  fileName?: string;
}): Promise<string | null> => {
  const { bucket } = getS3Config();
  const ext = path.extname(file.originalname);
  const baseName = fileName || `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const finalKey = `${baseName}${ext || ''}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: finalKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    ...aclOption(),
  });

  try {
    await s3Client.send(command);
    return getPublicFileUrl(finalKey);
  } catch (error) {
    console.error('uploadToS3 error:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, `File Upload failed (${describeError(error)})`);
  }
};

/**
 * Delete a single file from AWS S3 bucket by key.
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  const { bucket } = getS3Config();
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await s3Client.send(command);
  } catch (error) {
    console.error('🚀 deleteFromS3 error:', error);
    throw new Error('s3 file delete failed');
  }
};

/**
 * Upload multiple files to AWS S3 bucket.
 */
export const uploadManyToS3 = async (
  files: UploadManyItem[],
): Promise<S3UploadResult[]> => {
  const { bucket } = getS3Config();
  try {
    const uploadPromises = files.map(async ({ file, path: folderPath, key }) => {
      const ext = path.extname(file.originalname);
      const randomPart = `${Math.floor(100000 + Math.random() * 900000)}${Date.now()}`;

      // ✅ key already has extension (from generateS3Key) → don't add ext again
      const newFileName = key || `${randomPart}${ext || ''}`;
      const fileKey = `${folderPath}/${newFileName}`;

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        Body: file?.buffer,
        ContentType: file.mimetype,
        ...aclOption(),
      });

      await s3Client.send(command);

      const fileSize = file.size ?? (file.buffer ? file.buffer.length : 0);

      return {
        url: getPublicFileUrl(fileKey),
        key: newFileName,
        path: fileKey,
        fileSize,
      };
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls;
  } catch (error) {
    console.error('uploadManyToS3 error:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, `File Upload failed (${describeError(error)})`);
  }
};

/**
 * Delete multiple files from AWS S3 bucket by keys.
 */
export const deleteManyFromS3 = async (keys: string[]) => {
  const { bucket } = getS3Config();
  try {
    const deleteParams = {
      Bucket: bucket,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: false,
      },
    };
    const command = new DeleteObjectsCommand(deleteParams);
    const response = await s3Client.send(command);
    return response;
  } catch (error) {
    console.error('Error deleting S3 files:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'S3 file delete failed');
  }
};

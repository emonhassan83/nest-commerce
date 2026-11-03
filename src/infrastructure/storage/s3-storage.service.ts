import { Injectable, Logger } from '@nestjs/common';
import {
  deleteFromS3,
  deleteManyFromS3,
  getPublicFileUrl,
  S3UploadFile,
  S3UploadResult,
  UploadManyItem,
  uploadManyToS3,
  uploadToS3,
} from './s3.utils.js';

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);

  /**
   * Returns public URL of an S3 object.
   */
  getPublicFileUrl(key: string): string {
    return getPublicFileUrl(key);
  }

  /**
   * Upload a single file to AWS S3.
   */
  async uploadFile(payload: { file: S3UploadFile; fileName?: string }): Promise<string | null> {
    this.logger.debug(`Uploading file: ${payload.fileName || payload.file.originalname}`);
    return uploadToS3(payload);
  }

  /**
   * Delete a single file from S3 by key.
   */
  async deleteFile(key: string): Promise<void> {
    this.logger.debug(`Deleting file key: ${key}`);
    return deleteFromS3(key);
  }

  /**
   * Upload multiple files to AWS S3.
   */
  async uploadMany(files: UploadManyItem[]): Promise<S3UploadResult[]> {
    this.logger.debug(`Uploading ${files.length} files to S3`);
    return uploadManyToS3(files);
  }

  /**
   * Delete multiple files from S3.
   */
  async deleteMany(keys: string[]) {
    this.logger.debug(`Deleting ${keys.length} files from S3`);
    return deleteManyFromS3(keys);
  }
}

// Re-export utility functions directly for standalone usage
export {
  deleteFromS3,
  deleteManyFromS3,
  getPublicFileUrl,
  uploadManyToS3,
  uploadToS3,
};
export type { S3UploadFile, S3UploadResult, UploadManyItem };

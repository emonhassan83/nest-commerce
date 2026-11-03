import { Injectable, BadRequestException } from '@nestjs/common';
import { S3StorageService } from '../../infrastructure/storage/s3-storage.service.js';

export interface UploadResponseItem {
  url: string;
  fileSize: number;
  path: string;
}

@Injectable()
export class UploadService {
  constructor(private readonly s3StorageService: S3StorageService) {}

  /**
   * Upload multiple files to AWS S3 storage
   * @param files Array of uploaded Multer files
   * @param folder Destination directory/folder in S3 (defaults to 'uploads')
   */
  async uploadMultipleFiles(
    files: Array<Express.Multer.File>,
    folder: string = 'uploads',
  ): Promise<UploadResponseItem[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files were provided for upload');
    }

    const cleanFolder = folder.trim().replace(/^\/+|\/+$/g, '') || 'uploads';

    const items = files.map((file) => ({
      file: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      path: cleanFolder,
    }));

    const uploaded = await this.s3StorageService.uploadMany(items);

    return uploaded.map((item) => ({
      url: item.url,
      fileSize: item.fileSize,
      path: item.path,
    }));
  }
}

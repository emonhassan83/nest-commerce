import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller.js';
import { UploadService } from './upload.service.js';
import { S3StorageService } from '../../infrastructure/storage/s3-storage.service.js';

@Module({
  controllers: [UploadController],
  providers: [UploadService, S3StorageService],
  exports: [UploadService, S3StorageService],
})
export class UploadModule {}

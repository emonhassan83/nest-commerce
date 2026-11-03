import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { UploadService, UploadResponseItem } from './upload.service.js';

export interface UploadResponse {
  data: UploadResponseItem | UploadResponseItem[];
}

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload file(s) via multipart/form-data
   * POST /api/v1/upload
   * Accepts multiple files from form-data (e.g. key "files" or "file")
   * Optional body field "path" or "folder" to specify target S3 folder
   *
   * Response format:
   * Single file:
   * {
   *   "data": {
   *     "url": "https://...",
   *     "fileSize": 12345,
   *     "path": "uploads/..."
   *   }
   * }
   *
   * Multiple files:
   * {
   *   "data": [
   *     {
   *       "url": "https://...",
   *       "fileSize": 12345,
   *       "path": "uploads/..."
   *     }
   *   ]
   * }
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AnyFilesInterceptor())
  async uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body('path') pathField?: string,
    @Body('folder') folderField?: string,
  ): Promise<UploadResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'No file provided in form-data. Please attach one or more files under "files" or "file".',
      );
    }

    const targetFolder = pathField || folderField || 'uploads';
    const uploaded = await this.uploadService.uploadMultipleFiles(files, targetFolder);

    return {
      data: uploaded.length === 1 ? uploaded[0] : uploaded,
    };
  }
}

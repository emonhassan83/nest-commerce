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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { UploadService, UploadResponseItem } from './upload.service.js';

export interface UploadResponse {
  data: UploadResponseItem | UploadResponseItem[];
}

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload file(s) via multipart/form-data
   * POST /api/v1/upload
   * Accepts multiple files from form-data (e.g. key "files" or "file")
   * Optional body field "path" or "folder" to specify target S3 folder
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({
    summary: 'Upload one or multiple files to AWS S3',
    description:
      'Uploads files via multipart/form-data. Accepts multiple files under key "files" or "file".',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'One or more binary files to upload to S3',
        },
        path: {
          type: 'string',
          example: 'products',
          description: 'Target directory folder in S3 (defaults to "uploads")',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File(s) uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          oneOf: [
            {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  example:
                    'https://emonhassan.s3.ap-southeast-1.amazonaws.com/uploads/12345.png',
                },
                fileSize: { type: 'number', example: 102400 },
                path: { type: 'string', example: 'uploads/12345.png' },
              },
            },
            {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  fileSize: { type: 'number' },
                  path: { type: 'string' },
                },
              },
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'No file provided or S3 upload failure' })
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

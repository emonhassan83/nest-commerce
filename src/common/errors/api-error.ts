import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    message: string = 'Internal server error',
  ) {
    super(message, statusCode);
  }
}

export const httpStatus = HttpStatus;


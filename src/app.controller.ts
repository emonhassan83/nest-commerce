import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check and root greeting' })
  @ApiResponse({ status: 200, description: 'Server is running smoothly' })
  getHello(): string {
    return this.appService.getHello();
  }
}

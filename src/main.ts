import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { createCorsOptions, setupSwagger } from './config/index.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('app.port');
  const ip = configService.getOrThrow<string>('app.ip');
  const apiPrefix = configService.getOrThrow<string>('app.apiPrefix');
  const corsOrigins = configService.getOrThrow<string[]>('app.corsOrigins');
  const isWildcard = corsOrigins.includes('*');

  // Enterprise Best-Practice CORS Configuration from src/config
  app.enableCors(createCorsOptions(configService));

  app.setGlobalPrefix(apiPrefix);

  // Initialize Swagger Documentation
  setupSwagger(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Bind to '0.0.0.0' to ensure availability across all network interfaces (including IP)
  await app.listen(port, '0.0.0.0');
  logger.log(`Nest Commerce server listening on http://${ip}:${port}/${apiPrefix}`);
  logger.log(`CORS enabled for origins: ${isWildcard ? '*' : corsOrigins.join(', ')}`);
  logger.log(`Swagger documentation available at: http://${ip}:${port}/docs`);
}
await bootstrap();

import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

/**
 * Sets up OpenAPI / Swagger documentation with best-practice tags, metadata, and security schemes.
 */
export function setupSwagger(app: INestApplication): void {
  const logger = new Logger('Swagger');
  const configService = app.get(ConfigService);
  const ip = configService.getOrThrow<string>('app.ip');
  const port = configService.getOrThrow<number>('app.port');

  const config = new DocumentBuilder()
    .setTitle('Nest Commerce API')
    .setDescription(
      'Enterprise Modular Monolith E-Commerce REST API built with NestJS, Prisma, and Clean Architecture.\n\n' +
        '### Authentication\n' +
        'Direct token authentication via `Authorization: <token>` header (or `Bearer <token>`).\n' +
        'Click the **Authorize** button on the right to set your JWT token.',
    )
    .setVersion('1.0.0')
    .addServer(`http://${ip}:${port}`, 'Network IP Server')
    .addServer(`http://localhost:${port}`, 'Localhost Server')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'Direct JWT Access Token (or "Bearer <token>")',
      },
      'JWT-auth',
    )
    .addTag('App', 'General application health and system status')
    .addTag('Auth', 'Authentication, user registration, login, and session revocation')
    .addTag('User', 'User management, personal profile, and administrative role controls')
    .addTag('Upload', 'AWS S3 multi-file and single-file storage upload service')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
    customSiteTitle: 'Nest Commerce API Documentation',
  });

  logger.log(`Swagger documentation initialized at path http://${ip}:${port}/docs`);
}

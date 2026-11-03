import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Sets up OpenAPI / Swagger documentation with best-practice tags, metadata, and security schemes.
 */
export function setupSwagger(app: INestApplication): void {
  const logger = new Logger('Swagger');

  const config = new DocumentBuilder()
    .setTitle('Nest Commerce API')
    .setDescription(
      'Enterprise Modular Monolith E-Commerce REST API built with NestJS, Prisma, and Clean Architecture.\n\n' +
        '### Authentication\n' +
        'Direct token authentication via `Authorization: <token>` header (or `Bearer <token>`).\n' +
        'Click the **Authorize** button on the right to set your JWT token.',
    )
    .setVersion('1.0.0')
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
    .addTag('Category', 'Product category management, catalog hierarchy, and administration')
    .addTag('Product', 'Product catalog management, inventory, and administration')
    .addTag('Cart', 'Shopping cart management, items, quantity, and real-time totals')
    .addTag('Order', 'Order management, checkout, status progression, and inventory fulfillment')
    .addTag('Payment', 'Stripe checkout sessions, payment confirmations, and revenue transactions')
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

  logger.log('Swagger documentation initialized at path /docs');
}

import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';
import { ConfigService } from '@nestjs/config';

/**
 * Creates enterprise-grade, highly secure CORS options from centralized ConfigService.
 */
export function createCorsOptions(configService: ConfigService): CorsOptions {
  const corsOrigins = configService.getOrThrow<string[]>('app.corsOrigins');
  const isWildcard = corsOrigins.includes('*');

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow non-browser agents (cURL, Postman, mobile native apps, server-to-server)
      if (!origin || isWildcard || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(
        new Error(`[CORS Error] Origin "${origin}" is not allowed by CORS policy.`),
        false,
      );
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Authorization', 'Content-Disposition'],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
  };
}


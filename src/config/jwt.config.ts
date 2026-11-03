import { registerAs } from '@nestjs/config';
import { getEnvOrThrow } from './app.config.js';

export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export default registerAs(
  'jwt',
  (): JwtConfig => ({
    accessSecret: getEnvOrThrow('JWT_ACCESS_SECRET'),
    accessExpiresIn: getEnvOrThrow('JWT_ACCESS_EXPIRES_IN'),
    refreshSecret: getEnvOrThrow('JWT_REFRESH_SECRET'),
    refreshExpiresIn: getEnvOrThrow('JWT_REFRESH_EXPIRES_IN'),
  }),
);


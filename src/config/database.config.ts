import { registerAs } from '@nestjs/config';
import { getEnvOrThrow } from './app.config.js';

export interface DatabaseConfig {
  url: string;
}

export default registerAs(
  'database',
  (): DatabaseConfig => ({
    url: getEnvOrThrow('DATABASE_URL'),
  }),
);

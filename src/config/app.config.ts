import { registerAs } from '@nestjs/config';

/**
 * Retrieves an environment variable or throws an explicit error if missing.
 * Guarantees zero silent fallback default values.
 */
export function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`[Config Error] Missing required environment variable: "${key}"`);
  }
  return value;
}

/**
 * Parses comma-separated origin strings into a clean array.
 */
export function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
}

export default registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: getEnvOrThrow('NODE_ENV'),
    port: Number(getEnvOrThrow('PORT')),
    apiPrefix: getEnvOrThrow('API_PREFIX'),
    corsOrigins: parseCorsOrigins(getEnvOrThrow('CORS_ORIGIN')),
  }),
);

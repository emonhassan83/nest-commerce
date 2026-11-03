import { registerAs } from '@nestjs/config';

/**
 * Retrieves an environment variable or throws an explicit error if missing.
 */
export function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`[Config Error] Missing required environment variable: "${key}"`);
  }
  return value;
}

/**
 * Retrieves an environment variable or returns a default value if missing.
 */
export function getEnvOrDefault(key: string, defaultValue: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    return defaultValue;
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
    nodeEnv: getEnvOrDefault('NODE_ENV', 'development'),
    port: Number(getEnvOrDefault('PORT', '3000')),
    apiPrefix: getEnvOrDefault('API_PREFIX', 'api/v1'),
    corsOrigins: parseCorsOrigins(
      getEnvOrDefault('CORS_ORIGIN', 'http://localhost:3000,http://localhost:5173,http://localhost:3001'),
    ),
  }),
);

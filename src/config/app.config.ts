import { registerAs } from '@nestjs/config';

/**
 * Retrieves an environment variable or throws an explicit error if missing.
 * Guarantees zero silent fallback default values for critical configurations.
 */
export function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`[Config Error] Missing required environment variable: "${key}"`);
  }
  return value;
}

/**
 * Retrieves an environment variable or falls back to a default value if missing.
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
  ip: string;
  apiPrefix: string;
  corsOrigins: string[];
}

export default registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: getEnvOrThrow('NODE_ENV'),
    port: Number(getEnvOrThrow('PORT')),
    ip: getEnvOrThrow('IP'),
    apiPrefix: getEnvOrThrow('API_PREFIX'),
    corsOrigins: parseCorsOrigins(getEnvOrThrow('CORS_ORIGIN')),
  }),
);

import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { getEnvOrThrow } from './src/config/app.config.js';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: getEnvOrThrow('DATABASE_URL'),
  },
  $prismaConfig: 1,
} as any);

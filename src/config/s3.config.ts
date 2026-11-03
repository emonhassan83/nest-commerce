import 'dotenv/config';
import { S3Client } from '@aws-sdk/client-s3';
import { registerAs } from '@nestjs/config';
import { getEnvOrThrow } from './app.config.js';

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
  publicUrl?: string;
  forcePathStyle?: boolean;
  objectAcl?: string;
}

export const getS3Config = (): S3Config => ({
  accessKeyId: getEnvOrThrow('S3_ACCESS_KEY'),
  secretAccessKey: getEnvOrThrow('S3_SECRET_KEY'),
  region: getEnvOrThrow('S3_REGION'),
  bucket: getEnvOrThrow('S3_BUCKET_NAME'),
  endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
  publicUrl: process.env.S3_PUBLIC_URL?.trim() || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  objectAcl: process.env.S3_OBJECT_ACL?.trim() || 'none',
});

let _s3Client: S3Client | null = null;

export const setS3Client = (client: S3Client | null): void => {
  _s3Client = client;
};

export const getS3Client = (): S3Client => {
  if (!_s3Client) {
    const conf = getS3Config();
    _s3Client = new S3Client({
      region: conf.region,
      endpoint: conf.endpoint,
      forcePathStyle: conf.forcePathStyle,
      credentials: {
        accessKeyId: conf.accessKeyId,
        secretAccessKey: conf.secretAccessKey,
      },
    });
  }
  return _s3Client;
};

/**
 * Lazy S3 client delegate. Automatically instantiates S3Client on first use.
 * Seamlessly supports `s3Client.send(...)` and testing spies.
 */
export const s3Client = {
  send: (command: any, options?: any) => getS3Client().send(command, options),
} as unknown as S3Client;

export default registerAs('s3', (): S3Config => getS3Config());

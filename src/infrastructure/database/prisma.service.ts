import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: pg.Pool;

  constructor(private readonly configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>('database.url');

    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      // Verify real connection with a ping query
      await this.$queryRaw`SELECT 1`;
      this.logger.log('🚀 [Database] PostgreSQL connected successfully via Prisma Client!');
    } catch (error: any) {
      this.logger.error(`❌ [Database] Connection failed: ${error.message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Database disconnected successfully');
  }
}

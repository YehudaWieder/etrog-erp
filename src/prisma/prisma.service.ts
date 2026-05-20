import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma';

const DEFAULT_POOL_SIZE = 5;

function getPoolSize(): number {
  const rawPoolSize = process.env.DATABASE_POOL_SIZE;

  if (!rawPoolSize) {
    return DEFAULT_POOL_SIZE;
  }

  const parsedPoolSize = Number(rawPoolSize);

  if (!Number.isInteger(parsedPoolSize) || parsedPoolSize < 1) {
    throw new Error('DATABASE_POOL_SIZE must be a positive integer when defined.');
  }

  return parsedPoolSize;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is missing. Set it in your environment or .env file before starting the app.');
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: getPoolSize(),
    });
    const adapter = new PrismaPg(pool, {
      disposeExternalPool: true,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
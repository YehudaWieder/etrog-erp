import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPg } = require('@prisma/adapter-pg');

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is missing. Set it in your environment or .env file before starting the app.');
    }

    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
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
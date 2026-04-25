// src/system-config/services/config/config.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Currency, Prisma } from '@prisma/client';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  // Get or create config per season
  async getOrCreateConfig(
    seasonId: number,
    data?: { currency?: Currency; unitPrice?: number },
  ) {
    const updateData: Prisma.SystemConfigUpdateInput = {};
    const createData: Prisma.SystemConfigUncheckedCreateInput = {
      seasonId,
    };

    if (data?.currency !== undefined) {
      updateData.currency = data.currency;
      createData.currency = data.currency;
    }

    if (data?.unitPrice !== undefined) {
      updateData.unitPrice = data.unitPrice;
      createData.unitPrice = data.unitPrice;
    }

    return this.prisma.systemConfig.upsert({
      where: { id: seasonId }, 
      update: updateData,
      create: createData,
    });
  }

  // Get config
  async getConfig(seasonId: number) {
    const config = await this.prisma.systemConfig.findFirst({
      where: { seasonId },
    });

    if (!config) {
      return this.getOrCreateConfig(seasonId);
    }

    return config;
  }

  // Update pricing
  async updatePricing(
    seasonId: number,
    currency: Currency,
    unitPrice: number,
  ) {
    const config = await this.getOrCreateConfig(seasonId);

    return this.prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        currency,
        unitPrice,
      },
    });
  }

  // Generic update
  async updateConfig(
    seasonId: number,
    data: Prisma.SystemConfigUpdateInput,
  ) {
    const config = await this.getOrCreateConfig(seasonId);

    return this.prisma.systemConfig.update({
      where: { id: config.id },
      data,
    });
  }
}


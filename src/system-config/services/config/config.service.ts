// src/system-config/services/config/config.service.ts

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Currency, Prisma } from '@prisma/client';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  private async assertSeasonExists(seasonId: number) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      select: { id: true },
    });

    if (!season) {
      throw new NotFoundException(`Season with ID ${seasonId} not found.`);
    }
  }

  private hasCompletePricingDefinition(data?: { currency?: Currency; unitPrice?: number }) {
    return data?.currency !== undefined && data?.unitPrice !== undefined;
  }

  // Upsert season config with pricing-focused data.
  // When creating a new config, both pricing fields must be provided.
  async getOrCreateConfig(
    seasonId: number,
    data?: { currency?: Currency; unitPrice?: number },
    options?: { requirePricingOnCreate?: boolean },
  ) {
    await this.assertSeasonExists(seasonId);

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

    const existingConfig = await this.prisma.systemConfig.findFirst({
      where: { seasonId },
    });

    if (existingConfig) {
      if (Object.keys(updateData).length === 0) {
        return existingConfig;
      }

      return this.prisma.systemConfig.update({
        where: { id: existingConfig.id },
        data: updateData,
      });
    }

    if (options?.requirePricingOnCreate && !this.hasCompletePricingDefinition(data)) {
      throw new BadRequestException(
        'Creating a configuration requires both pricing fields: currency and unitPrice.',
      );
    }

    return this.prisma.systemConfig.create({ data: createData });
  }

  // Get config
  async getConfig(seasonId: number) {
    await this.assertSeasonExists(seasonId);

    const config = await this.prisma.systemConfig.findFirst({
      where: { seasonId },
    });

    if (!config) {
      throw new NotFoundException(`Configuration for season ${seasonId} was not found.`);
    }

    return config;
  }

  // Update pricing
  async updatePricing(
    seasonId: number,
    currency: Currency,
    unitPrice: number,
  ) {
    const config = await this.getConfig(seasonId);

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
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException('At least one configuration field must be provided for update.');
    }

    const config = await this.getConfig(seasonId);

    return this.prisma.systemConfig.update({
      where: { id: config.id },
      data,
    });
  }
}


// src/system-config/services/config/config.service.ts

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Currency, Prisma } from 'src/generated/prisma';

type SystemConfigPayload = {
  currency?: Currency;
  unitPrice?: number;
  smallBoxCapacity?: number;
  mediumBoxCapacity?: number;
  largeBoxCapacity?: number;
  customBoxCapacity?: number;
};

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  private assertPositiveCapacity(value: unknown, field: string) {
    if (value === undefined || value === null) return;

    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new BadRequestException(`${field} must be a positive integer.`);
    }
  }

  private validateCapacities(data?: SystemConfigPayload) {
    this.assertPositiveCapacity(data?.smallBoxCapacity, 'smallBoxCapacity');
    this.assertPositiveCapacity(data?.mediumBoxCapacity, 'mediumBoxCapacity');
    this.assertPositiveCapacity(data?.largeBoxCapacity, 'largeBoxCapacity');
    this.assertPositiveCapacity(data?.customBoxCapacity, 'customBoxCapacity');
  }

  private async assertSeasonExists(seasonId: number) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      select: { id: true },
    });

    if (!season) {
      throw new NotFoundException(`Season with ID ${seasonId} not found.`);
    }
  }

  private hasCompletePricingDefinition(data?: SystemConfigPayload) {
    return data?.currency !== undefined && data?.unitPrice !== undefined;
  }

  // Upsert season config with pricing-focused data.
  // When creating a new config, both pricing fields must be provided.
  async getOrCreateConfig(
    seasonId: number,
    data?: SystemConfigPayload,
    options?: { requirePricingOnCreate?: boolean },
  ) {
    await this.assertSeasonExists(seasonId);
    this.validateCapacities(data);

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

    if (data?.smallBoxCapacity !== undefined) {
      updateData.smallBoxCapacity = data.smallBoxCapacity;
      createData.smallBoxCapacity = data.smallBoxCapacity;
    }

    if (data?.mediumBoxCapacity !== undefined) {
      updateData.mediumBoxCapacity = data.mediumBoxCapacity;
      createData.mediumBoxCapacity = data.mediumBoxCapacity;
    }

    if (data?.largeBoxCapacity !== undefined) {
      updateData.largeBoxCapacity = data.largeBoxCapacity;
      createData.largeBoxCapacity = data.largeBoxCapacity;
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

    this.validateCapacities({
      smallBoxCapacity: data.smallBoxCapacity as number | undefined,
      mediumBoxCapacity: data.mediumBoxCapacity as number | undefined,
      largeBoxCapacity: data.largeBoxCapacity as number | undefined,
    });

    const config = await this.getConfig(seasonId);

    return this.prisma.systemConfig.update({
      where: { id: config.id },
      data,
    });
  }
}


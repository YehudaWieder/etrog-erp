// src/israel/settings/services/general/israel-settings.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class IsraelSettingsService {
  constructor(private prisma: PrismaService) {}

  // Get the singleton Israel settings row — returns schema defaults when none exists yet
  async getSettings() {
    const settings = await this.prisma.israelSettings.findFirst();

    if (!settings) {
      return {
        id: null,
        cartonCapacity: 50,
        createdAt: null,
        updatedAt: null,
      };
    }

    return settings;
  }

  // Upsert the singleton Israel settings row
  async updateSettings(cartonCapacity: number | undefined, updatedById: number) {
    if (cartonCapacity === undefined) {
      throw new BadRequestException('At least one setting must be provided for update.');
    }

    if (!Number.isInteger(cartonCapacity) || cartonCapacity < 0) {
      throw new BadRequestException('cartonCapacity must be a non-negative integer.');
    }

    const existing = await this.prisma.israelSettings.findFirst();

    if (existing) {
      return this.prisma.israelSettings.update({
        where: { id: existing.id },
        data: { cartonCapacity, updatedById },
      });
    }

    return this.prisma.israelSettings.create({
      data: { cartonCapacity, updatedById },
    });
  }
}

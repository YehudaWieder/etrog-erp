import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  // Get config for a specific season
  async getConfig(seasonId: number) {
    const config = await this.prisma.systemConfig.findFirst({
      where: { seasonId },
    });
    if (!config) throw new NotFoundException(`Config for season ${seasonId} not found`);
    return config;
  }

  // Update or Create general settings
  async updateConfig(seasonId: number, data: Partial<Prisma.SystemConfigUpdateInput>) {
    return this.prisma.systemConfig.upsert({
      where: { id: 1 }, // Assuming a single global config row or specific logic per season
      update: { ...data, seasonId },
      create: { 
        id: 1, 
        seasonId, 
        fields: [], 
        categories: [],
        ...data as any 
      },
    });
  }

  // --- Field Management (CRUD for the fields array) ---

  async addField(seasonId: number, fieldName: string) {
    const config = await this.getConfig(seasonId);
    if (config.fields.includes(fieldName)) return config;

    return this.prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        fields: {
          set: [...config.fields, fieldName],
        },
      },
    });
  }

  async removeField(seasonId: number, fieldName: string) {
    const config = await this.getConfig(seasonId);
    return this.prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        fields: {
          set: config.fields.filter((f) => f !== fieldName),
        },
      },
    });
  }

  async updateFieldName(seasonId: number, oldName: string, newName: string) {
    const config = await this.getConfig(seasonId);
    const updatedFields = config.fields.map((f) => (f === oldName ? newName : f));
    
    return this.prisma.systemConfig.update({
      where: { id: config.id },
      data: { fields: { set: updatedFields } },
    });
  }
}
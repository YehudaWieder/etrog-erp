// src/israel/settings/services/fields/fields.service.ts

import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { normalizeIsraelFieldName } from './utils/israel-fields.utils';

@Injectable()
export class IsraelFieldsService {
  constructor(private prisma: PrismaService) {}

  async getAllFields() {
    return this.prisma.israelField.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async addField(name: string, updatedById: number) {
    const normalizedName = normalizeIsraelFieldName(name);

    try {
      return await this.prisma.israelField.create({
        data: {
          name: normalizedName,
          updatedById,
        },
      });
    } catch (error) {
      throw new BadRequestException('Field already exists');
    }
  }

  async removeField(id: number) {
    try {
      return await this.prisma.israelField.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete field because related records exist in the system.');
      }

      throw error;
    }
  }

  async updateField(id: number, newName: string, updatedById: number) {
    const normalizedName = normalizeIsraelFieldName(newName);

    try {
      return await this.prisma.israelField.update({
        where: { id },
        data: {
          name: normalizedName,
          updatedById,
        },
      });
    } catch (error) {
      throw new BadRequestException('Field update failed');
    }
  }
}

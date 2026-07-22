// src/system-config/services/fields/fields.service.ts

import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { createFieldSlug, normalizeFieldName } from './utils/fields.utils';

@Injectable()
export class FieldService {
  constructor(private prisma: PrismaService) {}

  // Get all fields
  async getAllFields() {
    return this.prisma.field.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Add field
  async addField(name: string) {
    const normalizedName = normalizeFieldName(name);

    try {
      return await this.prisma.field.create({
        data: {
          name: normalizedName,
          slug: createFieldSlug(normalizedName),
        },
      });
    } catch (error) {
      throw new BadRequestException('Field already exists');
    }
  }

  // Remove field
  async removeField(id: number) {
    try {
      return await this.prisma.field.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete field because related records exist in the system.');
      }

      throw error;
    }
  }

  // Update field name
  async updateFieldName(id: number, newName: string) {
    const normalizedName = normalizeFieldName(newName);

    try {
      return await this.prisma.field.update({
        where: { id },
        data: {
          name: normalizedName,
          slug: createFieldSlug(normalizedName),
        },
      });
    } catch (error) {
      throw new BadRequestException('Field update failed');
    }
  }
}
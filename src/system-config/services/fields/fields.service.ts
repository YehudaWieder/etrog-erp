// src/system-config/services/fields/fields.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

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
    try {
      return await this.prisma.field.create({
        data: {
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-')
        },
      });
    } catch (error) {
      throw new BadRequestException('Field already exists');
    }
  }

  // Remove field
  async removeField(id: number) {
    return this.prisma.field.delete({
      where: { id },
    });
  }

  // Update field name
  async updateFieldName(id: number, newName: string) {
    try {
      return await this.prisma.field.update({
        where: { id },
        data: {
          name: newName,
          slug: newName.toLowerCase().replace(/\s+/g, '-'),
        },
      });
    } catch (error) {
      throw new BadRequestException('Field update failed');
    }
  }
}
// src/categories/services/customer-cat/customer-cat.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerCatService {
  constructor(private prisma: PrismaService) {}

  // Create or Update a category grade and price for a customer
  async setPrice(data: {
    seasonId: number;
    customerId: number;
    name: string;
    grade: any;
    price: number;
    currency: any; // Using any or Currency enum from Prisma
  }) {
    return this.prisma.customerCategories.upsert({
      where: {
        seasonId_customerId_name_grade: {
          seasonId: data.seasonId,
          customerId: data.customerId,
          name: data.name,
          grade: data.grade,
        },
      },
      update: {
        price: data.price,
        currency: data.currency,
      },
      create: data,
    });
  }

  // Get all price categories for a specific customer in a season
  async findByCustomer(customerId: number, seasonId: number) {
    return this.prisma.customerCategories.findMany({
      where: { customerId, seasonId },
      orderBy: [{ name: 'asc' }, { grade: 'asc' }],
    });
  }

  // Get all prices for a specific season (for overview)
  async findAllBySeason(seasonId: number) {
    return this.prisma.customerCategories.findMany({
      where: { seasonId },
      include: {
        customer: { select: { customerName: true } },
      },
      orderBy: { customerId: 'asc' },
    });
  }

  // Find single record by ID
  async findOne(id: number) {
    const record = await this.prisma.customerCategories.findUnique({
      where: { id },
      include: { customer: { select: { customerName: true } } },
    });
    if (!record) throw new NotFoundException(`Customer category price #${id} not found`);
    return record;
  }

  async findByCustomerAndNameGrade(customerId: number, seasonId: number, name: string, grade: any) {
    return this.prisma.customerCategories.findUnique({
      where: {
        seasonId_customerId_name_grade: {
          seasonId,
          customerId,
          name,
          grade,
        },
      },
    });
  }


  // Update specific fields
  async update(id: number, data: Prisma.CustomerCategoriesUpdateInput) {
    return this.prisma.customerCategories.update({
      where: { id },
      data,
    });
  }

  // Remove a price record
  async remove(id: number) {
    return this.prisma.customerCategories.delete({
      where: { id },
    });
  }
}
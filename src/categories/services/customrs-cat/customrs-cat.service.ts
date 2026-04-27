// src/categories/services/customer-cat/customer-cat.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Currency, Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@Injectable()
export class CustomerCatService {
  constructor(private prisma: PrismaService) {}

  private isManagerOrAbove(actor: AuthenticatedUser) {
    return actor.role === Role.MANAGER || actor.role === Role.OWNER;
  }

  private async resolveCurrency(seasonId: number, providedCurrency?: Currency) {
    if (providedCurrency) {
      return providedCurrency;
    }

    const config = await this.prisma.systemConfig.findFirst({
      where: { seasonId },
      orderBy: { updatedAt: 'desc' },
      select: { currency: true },
    });

    return config?.currency ?? Currency.ILS;
  }

  // Create or Update a category grade and price for a customer
  async setPrice(data: {
    seasonId: number;
    customerId: number;
    name: string;
    grade: any;
    price?: number;
    currency?: Currency;
  }, actor: AuthenticatedUser) {
    const managerOrAbove = this.isManagerOrAbove(actor);
    const currency = await this.resolveCurrency(data.seasonId, data.currency);

    if (!managerOrAbove) {
      return this.prisma.customerCategories.upsert({
        where: {
          seasonId_customerId_name_grade: {
            seasonId: data.seasonId,
            customerId: data.customerId,
            name: data.name,
            grade: data.grade,
          },
        },
        update: {},
        create: {
          seasonId: data.seasonId,
          customerId: data.customerId,
          name: data.name,
          grade: data.grade,
          price: 0,
          currency,
        },
      });
    }

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
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
      },
      create: {
        seasonId: data.seasonId,
        customerId: data.customerId,
        name: data.name,
        grade: data.grade,
        price: data.price ?? 0,
        currency,
      },
    });
  }

  // Get all price categories for a specific customer in a season
  async findByCustomer(customerId: number, seasonId: number, actor: AuthenticatedUser) {
    const managerOrAbove = this.isManagerOrAbove(actor);

    return this.prisma.customerCategories.findMany({
      where: { customerId, seasonId },
      ...(managerOrAbove
        ? {}
        : {
            select: {
              id: true,
              seasonId: true,
              customerId: true,
              name: true,
              grade: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
      orderBy: [{ name: 'asc' }, { grade: 'asc' }],
    });
  }

  // Get all prices for a specific season (for overview)
  async findAllBySeason(seasonId: number, actor: AuthenticatedUser) {
    const managerOrAbove = this.isManagerOrAbove(actor);

    if (managerOrAbove) {
      return this.prisma.customerCategories.findMany({
        where: { seasonId },
        include: {
          customer: { select: { customerName: true } },
        },
        orderBy: { customerId: 'asc' },
      });
    }

    return this.prisma.customerCategories.findMany({
      where: { seasonId },
      select: {
        id: true,
        seasonId: true,
        customerId: true,
        name: true,
        grade: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: { customerName: true } },
      },
      orderBy: { customerId: 'asc' },
    });
  }

  // Find single record by ID
  async findOne(id: number, actor: AuthenticatedUser) {
    const managerOrAbove = this.isManagerOrAbove(actor);

    const record = managerOrAbove
      ? await this.prisma.customerCategories.findUnique({
          where: { id },
          include: { customer: { select: { customerName: true } } },
        })
      : await this.prisma.customerCategories.findUnique({
          where: { id },
          select: {
            id: true,
            seasonId: true,
            customerId: true,
            name: true,
            grade: true,
            createdAt: true,
            updatedAt: true,
            customer: { select: { customerName: true } },
          },
        });

    if (!record) throw new NotFoundException(`Customer category price #${id} not found`);
    return record;
  }

  async findByCustomerAndNameGrade(customerId: number, seasonId: number, name: string, grade: any, actor: AuthenticatedUser) {
    const managerOrAbove = this.isManagerOrAbove(actor);

    return this.prisma.customerCategories.findUnique({
      where: {
        seasonId_customerId_name_grade: {
          seasonId,
          customerId,
          name,
          grade,
        },
      },
      ...(managerOrAbove
        ? {}
        : {
            select: {
              id: true,
              seasonId: true,
              customerId: true,
              name: true,
              grade: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
    });
  }


  // Update specific fields
  async update(id: number, data: Prisma.CustomerCategoriesUpdateInput, actor: AuthenticatedUser) {
    if (!this.isManagerOrAbove(actor)) {
      const { price, currency, ...safeData } = data as Prisma.CustomerCategoriesUpdateInput & {
        price?: unknown;
        currency?: unknown;
      };

      if (Object.keys(safeData).length === 0) {
        return this.findOne(id, actor);
      }

      return this.prisma.customerCategories.update({
        where: { id },
        data: safeData,
      });
    }

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
// src/categories/services/customer-cat/customer-cat.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Currency, Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class CustomerCatService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  private isManagerOrAbove(actor: AuthenticatedUser) {
    return actor.role === Role.MANAGER || actor.role === Role.OWNER;
  }

  private toWorkerCategoryView(record: {
    id: number;
    name: string;
    grade: string | null;
    customerId?: number;
    customer?: { customerName: string } | null;
  }) {
    return {
      id: record.id,
      name: record.name,
      grade: record.grade,
      percent: null,
      notes: null,
      customerId: record.customerId ?? null,
      customerName: record.customer?.customerName ?? null,
    };
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
    const seasonId = data.seasonId;
    await this.seasonsService.assertSeasonExists(seasonId);

    const managerOrAbove = this.isManagerOrAbove(actor);
    const currency = await this.resolveCurrency(seasonId, data.currency);

    if (!managerOrAbove) {
      return this.prisma.customerCategories.upsert({
        where: {
          seasonId_customerId_name_grade: {
            seasonId,
            customerId: data.customerId,
            name: data.name,
            grade: data.grade,
          },
        },
        update: {},
        create: {
          seasonId,
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
          seasonId,
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
        seasonId,
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
    await this.seasonsService.assertSeasonExists(seasonId);

    const managerOrAbove = this.isManagerOrAbove(actor);

    if (managerOrAbove) {
      return this.prisma.customerCategories.findMany({
        where: { customerId, seasonId },
        orderBy: [{ name: 'asc' }, { grade: 'asc' }],
      });
    }

    const records = await this.prisma.customerCategories.findMany({
      where: { customerId, seasonId },
      select: {
        id: true,
        name: true,
        grade: true,
        customerId: true,
        customer: { select: { customerName: true } },
      },
      orderBy: [{ name: 'asc' }, { grade: 'asc' }],
    });

    return records.map((record) => this.toWorkerCategoryView(record));
  }

  // Get all prices for a specific season (for overview)
  async findAllBySeason(seasonId: number, actor: AuthenticatedUser) {
    await this.seasonsService.assertSeasonExists(seasonId);

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

    const records = await this.prisma.customerCategories.findMany({
      where: { seasonId },
      select: {
        id: true,
        name: true,
        grade: true,
        customerId: true,
        customer: { select: { customerName: true } },
      },
      orderBy: { customerId: 'asc' },
    });

    return records.map((record) => this.toWorkerCategoryView(record));
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
            name: true,
            grade: true,
            customerId: true,
            customer: { select: { customerName: true } },
          },
        });

    if (!record) throw new NotFoundException(`Customer category price #${id} not found`);
    return managerOrAbove ? record : this.toWorkerCategoryView(record);
  }

  async findByCustomerAndNameGrade(customerId: number, seasonId: number, name: string, grade: any, actor: AuthenticatedUser) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const managerOrAbove = this.isManagerOrAbove(actor);

    const record = await this.prisma.customerCategories.findUnique({
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
              name: true,
              grade: true,
              customerId: true,
              customer: { select: { customerName: true } },
            },
          }),
    });
    if (!record) throw new NotFoundException(`Customer category price not found for customerId=${customerId}, seasonId=${seasonId}, name=${name}, grade=${grade}`);
    return !managerOrAbove && record ? this.toWorkerCategoryView(record) : record;
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
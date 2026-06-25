// src/categories/services/customer-cat/customer-cat.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Currency, Grade, Prisma } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { SeasonsService } from 'src/seasons/seasons.service';
import { SetCustomerCategoryPriceDto } from './dto/set-customer-category-price.dto';
import { UpdateCustomerCategoryDto } from './dto/update-customer-category.dto';
import {
  isManagerOrAbove,
  toWorkerCustomerCategoryView,
} from './utils/customer-cat.utils';

@Injectable()
export class CustomerCatService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

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

  private buildCategoryKey(data: {
    seasonId: number;
    customerId: number;
    name: string;
    grade: Grade;
  }): Prisma.CustomerCategoriesSeasonIdCustomerIdNameGradeCompoundUniqueInput {
    return {
      seasonId: data.seasonId,
      customerId: data.customerId,
      name: data.name,
      grade: data.grade,
    };
  }

  private buildWorkerCreateData(
    data: SetCustomerCategoryPriceDto,
    currency: Currency,
  ): Prisma.CustomerCategoriesUncheckedCreateInput {
    return {
      seasonId: data.seasonId,
      customerId: data.customerId,
      name: data.name,
      grade: data.grade,
      price: 0,
      currency,
    };
  }

  private buildManagerCreateData(
    data: SetCustomerCategoryPriceDto,
    currency: Currency,
  ): Prisma.CustomerCategoriesUncheckedCreateInput {
    return {
      seasonId: data.seasonId,
      customerId: data.customerId,
      name: data.name,
      grade: data.grade,
      price: data.price ?? 0,
      currency,
    };
  }

  private buildManagerUpdateData(
    data: SetCustomerCategoryPriceDto,
  ): Prisma.CustomerCategoriesUpdateInput {
    return {
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
    };
  }

  private async findWorkerViewById(id: number) {
    return this.prisma.customerCategories.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        grade: true,
        customerId: true,
        customer: { select: { customerName: true } },
      },
    });
  }

  private async findManagerViewById(id: number) {
    return this.prisma.customerCategories.findUnique({
      where: { id },
      include: { customer: { select: { customerName: true } } },
    });
  }

  // Create or Update a category grade and price for a customer
  async setPrice(data: SetCustomerCategoryPriceDto, actor: AuthenticatedUser) {
    const seasonId = data.seasonId;
    await this.seasonsService.assertSeasonExists(seasonId);

    const managerOrAbove = isManagerOrAbove(actor);
    const currency = await this.resolveCurrency(seasonId, data.currency);
    const categoryKey = this.buildCategoryKey(data);

    if (!managerOrAbove) {
      return this.prisma.customerCategories.upsert({
        where: {
          seasonId_customerId_name_grade: categoryKey,
        },
        update: {},
        create: this.buildWorkerCreateData(data, currency),
      });
    }

    return this.prisma.customerCategories.upsert({
      where: {
        seasonId_customerId_name_grade: categoryKey,
      },
      update: this.buildManagerUpdateData(data),
      create: this.buildManagerCreateData(data, currency),
    });
  }

  // Get all price categories for a specific customer in a season
  async findByCustomer(
    customerId: number,
    seasonId: number,
    actor: AuthenticatedUser,
  ) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const managerOrAbove = isManagerOrAbove(actor);

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

    return records.map((record) => toWorkerCustomerCategoryView(record));
  }

  // Get all prices for a specific season (for overview)
  async findAllBySeason(seasonId: number, actor: AuthenticatedUser) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const managerOrAbove = isManagerOrAbove(actor);

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

    return records.map((record) => toWorkerCustomerCategoryView(record));
  }

  // Find single record by ID
  async findOne(id: number, actor: AuthenticatedUser) {
    const managerOrAbove = isManagerOrAbove(actor);

    const record = managerOrAbove
      ? await this.findManagerViewById(id)
      : await this.findWorkerViewById(id);

    if (!record)
      throw new NotFoundException(`Customer category price #${id} not found`);
    return managerOrAbove ? record : toWorkerCustomerCategoryView(record);
  }

  async findByCustomerAndNameGrade(
    customerId: number,
    seasonId: number,
    name: string,
    grade: Grade,
    actor: AuthenticatedUser,
  ) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const managerOrAbove = isManagerOrAbove(actor);

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
    if (!record)
      throw new NotFoundException(
        `Customer category price not found for customerId=${customerId}, seasonId=${seasonId}, name=${name}, grade=${grade}`,
      );
    return !managerOrAbove && record
      ? toWorkerCustomerCategoryView(record)
      : record;
  }

  // Update specific fields
  async update(
    id: number,
    data: Omit<UpdateCustomerCategoryDto, 'id'>,
    actor: AuthenticatedUser,
  ) {
    if (!isManagerOrAbove(actor)) {
      const { price, currency, ...safeData } =
        data as Prisma.CustomerCategoriesUpdateInput & {
          price?: unknown;
          currency?: unknown;
        };
      void price;
      void currency;

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
  // Blocked only if classifications, allocations, or shipment items are linked.
  async remove(id: number) {
    const category = await this.prisma.customerCategories.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            classifications: true,
            customerAllocations: true,
            shipmentItems: true,
          },
        },
      },
    });

    if (!category) throw new NotFoundException('Customer category not found');

    const { classifications, customerAllocations, shipmentItems } = category._count;
    if (classifications > 0 || customerAllocations > 0 || shipmentItems > 0) {
      throw new ConflictException(
        'Cannot delete customer category because classifications, allocations, or shipment items are linked to it.',
      );
    }

    return this.prisma.customerCategories.delete({ where: { id } });
  }
}

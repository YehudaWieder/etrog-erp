import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateDefaultTraderCategoryDto,
} from './dto/create-default-trader-category.dto';
import {
  CreateDefaultTraderCategoryWithSharesDto,
} from './dto/create-default-trader-category-with-shares.dto';
import {
  UpdateDefaultTraderCategoryDto,
} from './dto/update-default-trader-category.dto';
import {
  CreateDefaultTraderCategoryShareDto,
} from './dto/create-default-trader-category-share.dto';
import {
  ReorderDefaultTraderCategoriesDto,
} from './dto/reorder-default-trader-categories.dto';
import {
  normalizeCategoryName,
  toApprovalResponse,
  validateCreateWithSharesPayload,
  validateProjectedCategoryTotal,
} from './utils/default-trader-category.utils';

@Injectable()
export class DefaultTraderCategoryService {
  constructor(private prisma: PrismaService) {}

  private async validateCategoryTotalPercent(
    categoryId: number,
    newPercent: number,
    excludeTraderId?: number,
  ) {
    const shares = await this.prisma.defaultTraderCategoryShare.findMany({
      where: { defaultTraderCategoryId: categoryId },
      select: {
        traderId: true,
        percent: true,
      },
    });

    validateProjectedCategoryTotal(shares, newPercent, categoryId, excludeTraderId);
  }

  /**
   * Create a new default trader category
   */
  async create(dto: CreateDefaultTraderCategoryDto) {
    const categoryName = normalizeCategoryName(dto.name);

    // Check if category already exists
    const existing = await this.prisma.defaultTraderCategory.findUnique({
      where: { name: categoryName },
    });

    if (existing) {
      throw new ConflictException(
        `Default trader category "${categoryName}" already exists`,
      );
    }

    return this.prisma.defaultTraderCategory.create({
      data: {
        name: categoryName,
        notes: dto.notes,
        supportedGrades: dto.supportedGrades,
      },
    });
  }

  /**
   * Create a default trader category together with its trader shares in one transaction
   */
  async createWithShares(dto: CreateDefaultTraderCategoryWithSharesDto) {
    validateCreateWithSharesPayload(dto);

    const categoryName = normalizeCategoryName(dto.name);
    if (!categoryName) {
      throw new BadRequestException('Category name is required.');
    }

    const existing = await this.prisma.defaultTraderCategory.findUnique({
      where: { name: categoryName },
    });

    if (existing) {
      throw new ConflictException(`Default trader category "${categoryName}" already exists`);
    }

    const traderIds = [...new Set(dto.shares.map((share) => Number(share.traderId)))];
    const traders = await this.prisma.trader.findMany({
      where: { id: { in: traderIds } },
      select: { id: true },
    });

    if (traders.length !== traderIds.length) {
      throw new NotFoundException('One or more selected traders were not found.');
    }

    const createdCategoryId = await this.prisma.$transaction(async (tx) => {
      const lastCategory = await tx.defaultTraderCategory.findFirst({
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });
      const nextOrderIndex = (lastCategory?.orderIndex ?? -1) + 1;

      const createdCategory = await tx.defaultTraderCategory.create({
        data: {
          name: categoryName,
          notes: dto.notes,
          supportedGrades: dto.supportedGrades,
          orderIndex: nextOrderIndex,
        },
        select: { id: true },
      });

      await tx.defaultTraderCategoryShare.createMany({
        data: dto.shares.map((share) => ({
          defaultTraderCategoryId: createdCategory.id,
          traderId: Number(share.traderId),
          percent: Number(share.percent),
        })),
      });

      return createdCategory.id;
    });

    const createdCategory = await this.prisma.defaultTraderCategory.findUnique({
      where: { id: createdCategoryId },
      include: {
        shares: {
          orderBy: { traderId: 'asc' },
          include: {
            trader: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!createdCategory) {
      throw new NotFoundException('Created default trader category was not found.');
    }

    return toApprovalResponse(createdCategory);
  }

  /**
   * Get all default trader categories with their shares
   */
  async findAll() {
    const categories = await this.prisma.defaultTraderCategory.findMany({
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
      include: {
        shares: {
          orderBy: { traderId: 'asc' },
          include: {
            trader: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return categories.map((cat) => toApprovalResponse(cat));
  }

  /**
   * Get a single default trader category
   */
  async findOne(id: number) {
    const category = await this.prisma.defaultTraderCategory.findUnique({
      where: { id },
      include: {
        shares: {
          orderBy: { traderId: 'asc' },
          include: {
            trader: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Default trader category with ID ${id} not found`,
      );
    }

    return toApprovalResponse(category);
  }

  /**
   * Update a default trader category
   */
  async update(id: number, dto: UpdateDefaultTraderCategoryDto) {
    const category = await this.prisma.defaultTraderCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(
        `Default trader category with ID ${id} not found`,
      );
    }

    // Check if new name already exists (if name is being updated)
    const normalizedName = dto.name ? normalizeCategoryName(dto.name) : undefined;

    if (normalizedName && normalizedName !== category.name) {
      const existing = await this.prisma.defaultTraderCategory.findUnique({
        where: { name: normalizedName },
      });

      if (existing) {
        throw new ConflictException(
          `Default trader category "${normalizedName}" already exists`,
        );
      }
    }

    const updated = await this.prisma.defaultTraderCategory.update({
      where: { id },
      data: {
        name: normalizedName,
        notes: dto.notes,
        supportedGrades: dto.supportedGrades,
      },
      include: {
        shares: {
          orderBy: { traderId: 'asc' },
          include: {
            trader: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return toApprovalResponse(updated);
  }

  /**
   * Persist a manual priority order for all default trader categories
   */
  async reorder(dto: ReorderDefaultTraderCategoriesDto) {
    const existing = await this.prisma.defaultTraderCategory.findMany({
      select: { id: true },
    });

    const existingIds = new Set(existing.map((category) => category.id));
    const uniqueOrderedIds = new Set(dto.orderedIds);

    if (
      uniqueOrderedIds.size !== dto.orderedIds.length ||
      uniqueOrderedIds.size !== existingIds.size ||
      dto.orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException(
        'orderedIds must contain exactly the set of existing default trader category IDs.',
      );
    }

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.defaultTraderCategory.update({
          where: { id },
          data: { orderIndex: index },
        }),
      ),
    );

    return { orderedIds: dto.orderedIds };
  }

  /**
   * Delete a default trader category
   * Only allowed if no seasons have been created yet that reference these defaults
   */
  async remove(id: number) {
    const category = await this.prisma.defaultTraderCategory.findUnique({
      where: { id },
      include: {
        shares: true,
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Default trader category with ID ${id} not found`,
      );
    }

    try {
      // Delete the category and its shares in a transaction
      return await this.prisma.$transaction(async (tx) => {
        // Delete all shares first
        if (category.shares.length > 0) {
          await tx.defaultTraderCategoryShare.deleteMany({
            where: { defaultTraderCategoryId: id },
          });
        }

        // Then delete the category
        return tx.defaultTraderCategory.delete({
          where: { id },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete default trader category because related records exist in the system.');
      }

      throw error;
    }
  }

  /**
   * Add a trader share to a default category
   */
  async addShare(defaultTraderCategoryId: number, dto: CreateDefaultTraderCategoryShareDto) {
    // Verify category exists
    const category = await this.prisma.defaultTraderCategory.findUnique({
      where: { id: defaultTraderCategoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Default trader category with ID ${defaultTraderCategoryId} not found`,
      );
    }

    // Verify trader exists
    const trader = await this.prisma.trader.findUnique({
      where: { id: dto.traderId },
    });

    if (!trader) {
      throw new NotFoundException(`Trader with ID ${dto.traderId} not found`);
    }

    // Check if share already exists
    const existing = await this.prisma.defaultTraderCategoryShare.findUnique({
      where: {
        traderId_defaultTraderCategoryId: {
          traderId: dto.traderId,
          defaultTraderCategoryId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Share already exists for trader ${trader.name} in this category`,
      );
    }

    await this.validateCategoryTotalPercent(defaultTraderCategoryId, dto.percent);

    return this.prisma.defaultTraderCategoryShare.create({
      data: {
        traderId: dto.traderId,
        defaultTraderCategoryId,
        percent: dto.percent,
      },
      include: {
        trader: {
          select: { id: true, name: true },
        },
        defaultTraderCategory: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Update a trader share percentage
   */
  async updateShare(
    defaultTraderCategoryId: number,
    traderId: number,
    percent: number,
  ) {
    const share = await this.prisma.defaultTraderCategoryShare.findUnique({
      where: {
        traderId_defaultTraderCategoryId: {
          traderId,
          defaultTraderCategoryId,
        },
      },
      include: {
        trader: true,
        defaultTraderCategory: {
          select: { id: true, name: true },
        },
      },
    });

    if (!share) {
      throw new NotFoundException(
        `Share not found for trader ${traderId} in category ${defaultTraderCategoryId}`,
      );
    }

    await this.validateCategoryTotalPercent(defaultTraderCategoryId, percent, traderId);

    return this.prisma.defaultTraderCategoryShare.update({
      where: {
        traderId_defaultTraderCategoryId: {
          traderId,
          defaultTraderCategoryId,
        },
      },
      data: {
        percent: percent,
      },
      include: {
        trader: {
          select: { id: true, name: true },
        },
        defaultTraderCategory: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Remove a trader share
   */
  async removeShare(defaultTraderCategoryId: number, traderId: number) {
    const share = await this.prisma.defaultTraderCategoryShare.findUnique({
      where: {
        traderId_defaultTraderCategoryId: {
          traderId,
          defaultTraderCategoryId,
        },
      },
    });

    if (!share) {
      throw new NotFoundException(
        `Share not found for trader ${traderId} in category ${defaultTraderCategoryId}`,
      );
    }

    try {
      return await this.prisma.defaultTraderCategoryShare.delete({
        where: {
          traderId_defaultTraderCategoryId: {
            traderId,
            defaultTraderCategoryId,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete default trader category share because related records exist in the system.');
      }

      throw error;
    }
  }
}

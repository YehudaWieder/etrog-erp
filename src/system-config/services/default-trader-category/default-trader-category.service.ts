import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateDefaultTraderCategorySwaggerDto,
  CreateDefaultTraderCategoryWithSharesSwaggerDto,
  UpdateDefaultTraderCategorySwaggerDto,
  CreateDefaultTraderCategoryShareSwaggerDto,
} from '../../../docs/dto/swagger-enums.dto';

@Injectable()
export class DefaultTraderCategoryService {
  constructor(private prisma: PrismaService) {}

  private static readonly DEFAULT_CATEGORY_TOTAL_EPSILON = 0.001;

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

    let total = newPercent;
    for (const share of shares) {
      if (excludeTraderId && share.traderId === excludeTraderId) {
        continue;
      }
      total += Number(share.percent);
    }

    if (total > 100) {
      throw new BadRequestException(
        `Total share percent cannot exceed 100% for category ${categoryId}. Current total would be ${total.toFixed(2)}%.`,
      );
    }
  }

  /**
   * Transform raw Prisma data to approval response format with computed totals
   */
  private transformToApprovalResponse(category: any) {
    let totalPercent = 0;
    const shares = (category.shares || []).map((share) => {
      const percent = Number(share.percent);
      totalPercent += percent;
      return {
        traderId: share.traderId,
        traderName: share.trader.name,
        percent,
      };
    });

    return {
      id: category.id,
      name: category.name,
      notes: category.notes,
      shares,
      totalPercent: Number(totalPercent.toFixed(2)),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private validateCreateWithSharesPayload(dto: CreateDefaultTraderCategoryWithSharesSwaggerDto) {
    if (!dto.shares?.length) {
      throw new BadRequestException('At least one trader share row is required.');
    }

    const seenTraderIds = new Set<number>();
    let totalPercent = 0;

    for (const share of dto.shares) {
      const traderId = Number(share.traderId);
      const percent = Number(share.percent);

      if (!Number.isInteger(traderId) || traderId <= 0) {
        throw new BadRequestException('Each share row must include a valid trader ID.');
      }

      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        throw new BadRequestException('Each share percent must be a number greater than 0 and up to 100.');
      }

      if (seenTraderIds.has(traderId)) {
        throw new BadRequestException('Trader rows must be unique within a category.');
      }

      seenTraderIds.add(traderId);
      totalPercent += percent;
    }

    if (Math.abs(totalPercent - 100) > DefaultTraderCategoryService.DEFAULT_CATEGORY_TOTAL_EPSILON) {
      throw new BadRequestException(`Total share percent must be exactly 100%. Current total is ${totalPercent.toFixed(2)}%.`);
    }
  }

  /**
   * Create a new default trader category
   */
  async create(dto: CreateDefaultTraderCategorySwaggerDto) {
    // Check if category already exists
    const existing = await this.prisma.defaultTraderCategory.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Default trader category "${dto.name}" already exists`,
      );
    }

    return this.prisma.defaultTraderCategory.create({
      data: {
        name: dto.name,
        notes: dto.notes,
      },
    });
  }

  /**
   * Create a default trader category together with its trader shares in one transaction
   */
  async createWithShares(dto: CreateDefaultTraderCategoryWithSharesSwaggerDto) {
    this.validateCreateWithSharesPayload(dto);

    const categoryName = dto.name.trim();
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
      const createdCategory = await tx.defaultTraderCategory.create({
        data: {
          name: categoryName,
          notes: dto.notes,
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

    return this.transformToApprovalResponse(createdCategory);
  }

  /**
   * Get all default trader categories with their shares
   */
  async findAll() {
    const categories = await this.prisma.defaultTraderCategory.findMany({
      orderBy: { name: 'asc' },
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

    return categories.map((cat) => this.transformToApprovalResponse(cat));
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

    return this.transformToApprovalResponse(category);
  }

  /**
   * Update a default trader category
   */
  async update(id: number, dto: UpdateDefaultTraderCategorySwaggerDto) {
    const category = await this.prisma.defaultTraderCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(
        `Default trader category with ID ${id} not found`,
      );
    }

    // Check if new name already exists (if name is being updated)
    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.defaultTraderCategory.findUnique({
        where: { name: dto.name },
      });

      if (existing) {
        throw new ConflictException(
          `Default trader category "${dto.name}" already exists`,
        );
      }
    }

    const updated = await this.prisma.defaultTraderCategory.update({
      where: { id },
      data: {
        name: dto.name,
        notes: dto.notes,
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

    return this.transformToApprovalResponse(updated);
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
  async addShare(defaultTraderCategoryId: number, dto: CreateDefaultTraderCategoryShareSwaggerDto) {
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

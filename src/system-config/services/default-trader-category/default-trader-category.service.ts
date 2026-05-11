import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateDefaultTraderCategorySwaggerDto,
  UpdateDefaultTraderCategorySwaggerDto,
  CreateDefaultTraderCategoryShareSwaggerDto,
} from '../../../docs/dto/swagger-enums.dto';

@Injectable()
export class DefaultTraderCategoryService {
  constructor(private prisma: PrismaService) {}

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
   * Get all default trader categories with their shares
   */
  async findAll() {
    return this.prisma.defaultTraderCategory.findMany({
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

    return category;
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

    return this.prisma.defaultTraderCategory.update({
      where: { id },
      data: {
        name: dto.name,
        notes: dto.notes,
      },
      include: {
        shares: {
          include: {
            trader: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
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

    // Delete the category and its shares in a transaction
    return this.prisma.$transaction(async (tx) => {
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
  }

  /**
   * Add a trader share to a default category
   */
  async addShare(categoryId: number, dto: CreateDefaultTraderCategoryShareSwaggerDto) {
    // Verify category exists
    const category = await this.prisma.defaultTraderCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Default trader category with ID ${categoryId} not found`,
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
          defaultTraderCategoryId: categoryId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Share already exists for trader ${trader.name} in this category`,
      );
    }

    return this.prisma.defaultTraderCategoryShare.create({
      data: {
        traderId: dto.traderId,
        defaultTraderCategoryId: categoryId,
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
    categoryId: number,
    traderId: number,
    percent: number,
  ) {
    const share = await this.prisma.defaultTraderCategoryShare.findUnique({
      where: {
        traderId_defaultTraderCategoryId: {
          traderId,
          defaultTraderCategoryId: categoryId,
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
        `Share not found for trader ${traderId} in category ${categoryId}`,
      );
    }

    return this.prisma.defaultTraderCategoryShare.update({
      where: {
        traderId_defaultTraderCategoryId: {
          traderId,
          defaultTraderCategoryId: categoryId,
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
  async removeShare(categoryId: number, traderId: number) {
    const share = await this.prisma.defaultTraderCategoryShare.findUnique({
      where: {
        traderId_defaultTraderCategoryId: {
          traderId,
          defaultTraderCategoryId: categoryId,
        },
      },
    });

    if (!share) {
      throw new NotFoundException(
        `Share not found for trader ${traderId} in category ${categoryId}`,
      );
    }

    return this.prisma.defaultTraderCategoryShare.delete({
      where: {
        traderId_defaultTraderCategoryId: {
          traderId,
          defaultTraderCategoryId: categoryId,
        },
      },
    });
  }
}

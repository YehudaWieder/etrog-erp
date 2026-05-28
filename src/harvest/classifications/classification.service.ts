import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class ClassificationService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  // Mutations are centralized under Harvest workflow.
  async create(data: Prisma.ClassificationUncheckedCreateInput) {
    void data;
    throw new BadRequestException(
      'Classification create is centralized under harvest workflow. Use POST /harvests/classifications with body-based harvestId and isPartialClassification.',
    );
  }

  // Get all classifications for a specific harvest report
  async findByHarvest(fieldHarvestId: number) {
    return this.prisma.classification.findMany({
      where: { fieldHarvestId, isDeleted: false },
      include: {
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        traderCategory: { select: { name: true } },
        customerCategory: { select: { name: true, grade: true } },
        updatedBy: { select: { name: true } },
      },
    });
  }

  // Get all classifications for a season
  async findAllBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    return this.prisma.classification.findMany({
      where: { seasonId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findDailySummaryBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const records = await this.prisma.classification.findMany({
      where: {
        seasonId,
        isDeleted: false,
        fieldHarvest: {
          isDeleted: false,
        },
      },
      select: {
        quantity: true,
        assignmentType: true,
        traderId: true,
        customerId: true,
        traderCategoryId: true,
        customerCategoryId: true,
        trader: {
          select: {
            name: true,
          },
        },
        customer: {
          select: {
            customerName: true,
          },
        },
        traderCategory: {
          select: {
            name: true,
          },
        },
        customerCategory: {
          select: {
            name: true,
          },
        },
        fieldHarvest: {
          select: {
            id: true,
            fieldId: true,
            dateGregorian: true,
            dateHebrew: true,
            field: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          fieldHarvest: {
            dateGregorian: 'desc',
          },
        },
        {
          fieldHarvest: {
            id: 'desc',
          },
        },
      ],
    });

    type DailySummaryRow = {
      harvestId: number;
      fieldId: number;
      fieldName: string;
      dateGregorian: Date;
      dateHebrew: string;
      totalSorted: number;
      categoryTotals: Record<string, number>;
    };

    type DailySummaryCategory = {
      key: string;
      label: string;
      ownerType: 'GENERAL' | 'TRADER' | 'CUSTOMER';
      ownerName: string | null;
      categoryName: string;
      total: number;
    };

    const rowsByHarvest = new Map<number, DailySummaryRow>();
    const categoriesByKey = new Map<string, DailySummaryCategory>();

    for (const record of records) {
      const harvest = record.fieldHarvest;
      if (!harvest) {
        continue;
      }

      if (!rowsByHarvest.has(harvest.id)) {
        rowsByHarvest.set(harvest.id, {
          harvestId: harvest.id,
          fieldId: harvest.fieldId,
          fieldName: harvest.field?.name ?? '-',
          dateGregorian: harvest.dateGregorian,
          dateHebrew: harvest.dateHebrew,
          totalSorted: 0,
          categoryTotals: {},
        });
      }

      const quantity = Number(record.quantity) || 0;
      if (quantity <= 0) {
        continue;
      }

      const traderName = record.trader?.name?.trim() ?? '';
      const customerName = record.customer?.customerName?.trim() ?? '';
      const owner = traderName
        ? {
            type: 'TRADER' as const,
            key: `trader:${record.traderId}`,
            name: traderName,
          }
        : customerName
          ? {
              type: 'CUSTOMER' as const,
              key: `customer:${record.customerId}`,
              name: customerName,
            }
          : {
              type: 'GENERAL' as const,
              key: 'general',
              name: null,
            };

      const categoryKeyBase = record.customerCategoryId
        ? `customer:${record.customerCategoryId}`
        : record.traderCategoryId
          ? `trader:${record.traderCategoryId}`
          : null;
      const categoryLabel = record.customerCategory?.name ?? record.traderCategory?.name ?? null;

      if (!categoryKeyBase || !categoryLabel) {
        continue;
      }

      const categoryName = categoryLabel.trim();
      if (!categoryName) {
        continue;
      }

      const ownerLabel = owner.name ?? 'כללי';
      const categoryKey = `${owner.key}|${categoryKeyBase}`;

      const row = rowsByHarvest.get(harvest.id)!;
      row.categoryTotals[categoryKey] = (row.categoryTotals[categoryKey] ?? 0) + quantity;
      row.totalSorted += quantity;

      const category = categoriesByKey.get(categoryKey);
      if (!category) {
        categoriesByKey.set(categoryKey, {
          key: categoryKey,
          label: `${ownerLabel} | ${categoryName}`,
          ownerType: owner.type,
          ownerName: owner.name,
          categoryName,
          total: quantity,
        });
      } else {
        category.total += quantity;
      }
    }

    const categories = Array.from(categoriesByKey.values())
      .filter((item) => item.total > 0)
      .sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }

        return a.label.localeCompare(b.label, 'he', {
          sensitivity: 'base',
          numeric: true,
        });
      });

    const rows = Array.from(rowsByHarvest.values())
      .filter((row) => row.totalSorted > 0)
      .map((row) => {
        const categoryTotals: Record<string, number> = {};
        for (const category of categories) {
          const value = row.categoryTotals[category.key] ?? 0;
          if (value > 0) {
            categoryTotals[category.key] = value;
          }
        }

        return {
          ...row,
          categoryTotals,
        };
      })
      .sort((a, b) => {
        const dateDiff = b.dateGregorian.getTime() - a.dateGregorian.getTime();
        if (dateDiff !== 0) {
          return dateDiff;
        }

        if (a.fieldName !== b.fieldName) {
          return a.fieldName.localeCompare(b.fieldName, 'he', {
            sensitivity: 'base',
            numeric: true,
          });
        }

        return b.harvestId - a.harvestId;
      });

    return {
      categories,
      rows,
    };
  }

  async findOne(id: number) {
    const record = await this.prisma.classification.findFirst({
      where: { id, isDeleted: false },
    });
    if (!record) throw new NotFoundException(`Classification #${id} not found`);
    return record;
  }

  async update(id: number, data: Prisma.ClassificationUncheckedUpdateInput) {
    void id;
    void data;
    throw new BadRequestException(
      'Classification update is centralized under harvest workflow. Use PATCH /harvests/classifications with body-based harvestId, classificationId, and isPartialClassification.',
    );
  }

  // Mutations are centralized under Harvest workflow.
  async remove(id: number) {
    void id;
    throw new BadRequestException(
      'Classification delete is centralized under harvest workflow. Use DELETE /harvests/classifications with body-based harvestId, classificationId, and isPartialClassification.',
    );
  }
}
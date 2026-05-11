import { Injectable } from '@nestjs/common';

/**
 * SeedService handles bootstrapping default data into new seasons.
 * All operations are transaction-safe and must be passed a Prisma transaction client.
 */
@Injectable()
export class SeedService {
  /**
   * Bootstrap default trader categories and shares into a new season.
   * All operations are wrapped in a single transaction for atomicity.
   *
   * @param seasonId - The ID of the newly created season
   * @param tx - Prisma transaction client (ensures all-or-nothing semantics)
   */
  async bootstrapDefaultsForSeason(
    seasonId: number,
    tx: any, // TransactionClient - uses any to avoid type conflicts between generated and node_modules Prisma
  ): Promise<void> {
    // Fetch all default trader categories
    const defaultCategories = await tx.defaultTraderCategory.findMany();

    if (defaultCategories.length === 0) {
      // No defaults to bootstrap
      return;
    }

    // Map to store template ID -> created season category ID for share creation
    const defaultToCategoryId = new Map<number, number>();

    // Copy all default categories to season-specific trader categories
    for (const defaultCategory of defaultCategories) {
      const created = await tx.tradersCategories.create({
        data: {
          seasonId,
          name: defaultCategory.name,
          notes: defaultCategory.notes,
          isDefault: true, // Mark as created from seed bootstrap
        },
      });
      defaultToCategoryId.set(defaultCategory.id, created.id);
    }

    // Fetch all default category shares
    const defaultShares = await tx.defaultTraderCategoryShare.findMany();

    // Copy all default shares to season-specific trader category shares
    for (const share of defaultShares) {
      const seasonCategoryId = defaultToCategoryId.get(
        share.defaultTraderCategoryId,
      );
      if (seasonCategoryId) {
        await tx.traderCategoryShare.create({
          data: {
            seasonId,
            traderId: share.traderId,
            traderCategoryId: seasonCategoryId,
            percent: share.percent,
          },
        });
      }
    }
  }
}

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('status')
  async getSetupStatus() {
    const [traderCount, defaultCategoryCount, seasonCount] = await Promise.all([
      this.prisma.trader.count(),
      this.prisma.defaultTraderCategory.count(),
      this.prisma.season.count(),
    ]);

    const hasTraders = traderCount > 0;
    const hasDefaultCategories = defaultCategoryCount > 0;
    const hasSeasons = seasonCount > 0;

    return {
      hasTraders,
      hasDefaultCategories,
      hasSeasons,
      isSetupComplete: hasTraders && hasDefaultCategories && hasSeasons,
    };
  }
}

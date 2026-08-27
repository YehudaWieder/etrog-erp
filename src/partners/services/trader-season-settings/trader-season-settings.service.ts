// src/partners/services/trader-season-settings/trader-season-settings.service.ts

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Currency } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { SetTraderSeasonSettingsDto } from './dto/set-trader-season-settings.dto';
import { validatePaymentPercentInput, decimalToNumber } from '../traders/utils/traders.utils';

@Injectable()
export class TraderSeasonSettingsService {
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

  // Create or update a trader's payment percent + price-per-etrog for a season
  async setForTrader(data: SetTraderSeasonSettingsDto) {
    const { seasonId, traderId } = data;
    await this.seasonsService.assertSeasonExists(seasonId);

    const trader = await this.prisma.trader.findUnique({ where: { id: traderId } });
    if (!trader) throw new NotFoundException(`Trader #${traderId} not found`);

    validatePaymentPercentInput(data.paymentPercent);

    await this.validateTotalPaymentPercent(seasonId, data.paymentPercent, traderId);

    const currency = await this.resolveCurrency(seasonId, data.currency);

    return this.prisma.traderSeasonSettings.upsert({
      where: { traderId_seasonId: { traderId, seasonId } },
      update: {
        paymentPercent: data.paymentPercent,
        pricePerEtrog: data.pricePerEtrog,
        currency,
      },
      create: {
        seasonId,
        traderId,
        paymentPercent: data.paymentPercent,
        pricePerEtrog: data.pricePerEtrog,
        currency,
      },
      include: { trader: { select: { name: true } } },
    });
  }

  // Get all trader settings for a specific season (for overview)
  async findAllBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    return this.prisma.traderSeasonSettings.findMany({
      where: { seasonId },
      include: { trader: { select: { name: true } } },
      orderBy: { traderId: 'asc' },
    });
  }

  // Get a single trader's settings for a season
  async findByTrader(traderId: number, seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    return this.prisma.traderSeasonSettings.findUnique({
      where: { traderId_seasonId: { traderId, seasonId } },
      include: { trader: { select: { name: true } } },
    });
  }

  // Remove a trader's season settings entry
  async remove(id: number) {
    const existing = await this.prisma.traderSeasonSettings.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Trader season settings #${id} not found`);

    return this.prisma.traderSeasonSettings.delete({ where: { id } });
  }

  // Validate that the sum of all traders' payment percentages within the season doesn't exceed 100
  private async validateTotalPaymentPercent(seasonId: number, newPercent: number, traderId: number) {
    const rows = await this.prisma.traderSeasonSettings.findMany({
      where: { seasonId, traderId: { not: traderId } },
      select: { paymentPercent: true },
    });

    let totalPercent = newPercent;
    for (const row of rows) {
      totalPercent += decimalToNumber(row.paymentPercent);
    }

    if (totalPercent > 100) {
      throw new BadRequestException(
        `Total payment percentage for this season would exceed 100%. Current: ${totalPercent.toFixed(2)}%`,
      );
    }
  }
}

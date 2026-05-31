// src/partners/services/traders/traders.service.ts

import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CreateTraderDto } from './dto/create-trader.dto';
import { UpdateTraderDto } from './dto/update-trader.dto';
import {
  createTraderSlug,
  decimalToNumber,
  isManagerOrAbove,
  normalizeTraderName,
  validatePaymentPercentInput,
} from './utils/traders.utils';

@Injectable()
export class TradersService {
  constructor(private prisma: PrismaService) {}

  // Create a new trader
  async create(data: CreateTraderDto) {
    const name = normalizeTraderName(data.name);
    const paymentPercent = data.paymentPercent;

    validatePaymentPercentInput(paymentPercent);

    const existing = await this.prisma.trader.findUnique({ where: { name } });
    if (existing) throw new ConflictException(`Trader with name ${name} already exists`);

    // Validate payment percent
    await this.validateTotalPaymentPercent(paymentPercent);

    return this.prisma.trader.create({
      data: {
        name,
        paymentPercent,
        slug: createTraderSlug(name),
      },
    });
  }

  // Get all traders. Editor receives only id and name.
  async findAllByActor(actor: AuthenticatedUser) {
    const allowFullView = isManagerOrAbove(actor);

    if (!allowFullView) {
      return this.prisma.trader.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    }

    return this.prisma.trader.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Find one by ID or Slug. Editor receives only id and name.
  async findOneByActor(idOrSlug: string | number, actor: AuthenticatedUser) {
    const allowFullView = isManagerOrAbove(actor);

    const trader = await this.prisma.trader.findFirst({
      where: typeof idOrSlug === 'number' ? { id: idOrSlug } : { slug: idOrSlug },
      ...(allowFullView ? {} : { select: { id: true, name: true } }),
    });

    if (!trader) throw new NotFoundException(`Trader not found`);
    return trader;
  }

  // Update trader details
  async update(data: UpdateTraderDto) {
    const id = data.id;
    const updateData: Partial<Prisma.TraderUpdateInput> = { ...data };
    delete (updateData as Record<string, unknown>).id;

    if (updateData.paymentPercent === undefined || typeof updateData.paymentPercent !== 'number') {
      throw new BadRequestException('paymentPercent is required');
    }

    validatePaymentPercentInput(updateData.paymentPercent);

    // If paymentPercent is being updated, validate the total
    if (typeof updateData.paymentPercent === 'number') {
      // Get the current trader's old payment percent
      const currentTrader = await this.prisma.trader.findUnique({ where: { id } });
      if (!currentTrader) throw new NotFoundException('Trader not found');

      // Calculate the difference in payment percent (convert Decimal to number)
      const currentPercentNumber = decimalToNumber(currentTrader.paymentPercent);
      const percentDifference = (updateData.paymentPercent as number) - currentPercentNumber;
      
      // Validate against the new total
      await this.validateTotalPaymentPercent(percentDifference, id);
    }

    // If name is changed, update the slug accordingly
    if (updateData.name && typeof updateData.name === 'string') {
      const normalizedName = normalizeTraderName(updateData.name);
      updateData.name = normalizedName;
      updateData.slug = createTraderSlug(normalizedName);
    }

    return this.prisma.trader.update({
      where: { id },
      data: updateData,
    });
  }

  // Private helper method to validate total payment percent across all traders
  private async validateTotalPaymentPercent(additionalPercent: number, excludeTrader?: number) {
    // Get sum of all traders' payment percentages (excluding the one being updated if provided)
    const traders = await this.prisma.trader.findMany({
      select: { id: true, paymentPercent: true },
    });

    let totalPercent = additionalPercent;
    for (const trader of traders) {
      if (excludeTrader && trader.id === excludeTrader) {
        // Skip the trader being updated
        continue;
      }
      // Convert Decimal to number for calculation
      const traderPercent = decimalToNumber(trader.paymentPercent);
      totalPercent += traderPercent;
    }

    if (totalPercent > 100) {
      throw new BadRequestException(
        `Total payment percentage would exceed 100%. Current: ${totalPercent.toFixed(2)}%`,
      );
    }
  }

  // Remove a trader
  // Note: Will fail if the trader has active stock or classifications (Foreign Key protection)
  async remove(id: number) {
    try {
      return await this.prisma.trader.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete trader because related records exist in the system.');
      }

      throw error;
    }
  }
}

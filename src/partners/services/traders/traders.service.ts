// src/partners/services/traders/traders.service.ts

import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@Injectable()
export class TradersService {
  constructor(private prisma: PrismaService) {}

  private validatePaymentPercentInput(paymentPercent: number): void {
    if (!Number.isFinite(paymentPercent) || paymentPercent < 0 || paymentPercent > 100) {
      throw new BadRequestException('paymentPercent must be between 0 and 100');
    }
  }

  // Create a new trader
  async create(name: string, paymentPercent: number) {
    this.validatePaymentPercentInput(paymentPercent);

    const existing = await this.prisma.trader.findUnique({ where: { name } });
    if (existing) throw new ConflictException(`Trader with name ${name} already exists`);

    // Validate payment percent
    await this.validateTotalPaymentPercent(paymentPercent);

    return this.prisma.trader.create({
      data: {
        name,
        paymentPercent,
        slug: name.toLowerCase().replace(/ /g, '-'),
      },
    });
  }

  // Get all traders. Editor receives only id and name.
  async findAllByActor(actor: AuthenticatedUser) {
    const isManagerOrAbove = actor.role === Role.MANAGER || actor.role === Role.OWNER;

    if (!isManagerOrAbove) {
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
    const isManagerOrAbove = actor.role === Role.MANAGER || actor.role === Role.OWNER;

    const trader = await this.prisma.trader.findFirst({
      where: typeof idOrSlug === 'number' ? { id: idOrSlug } : { slug: idOrSlug },
      ...(isManagerOrAbove ? {} : { select: { id: true, name: true } }),
    });

    if (!trader) throw new NotFoundException(`Trader not found`);
    return trader;
  }

  // Update trader details
  async update(id: number, data: Partial<Prisma.TraderUpdateInput>) {
    if (data.paymentPercent === undefined || typeof data.paymentPercent !== 'number') {
      throw new BadRequestException('paymentPercent is required');
    }

    this.validatePaymentPercentInput(data.paymentPercent);

    // If paymentPercent is being updated, validate the total
    if (typeof data.paymentPercent === 'number') {
      // Get the current trader's old payment percent
      const currentTrader = await this.prisma.trader.findUnique({ where: { id } });
      if (!currentTrader) throw new NotFoundException('Trader not found');

      // Calculate the difference in payment percent (convert Decimal to number)
      const currentPercentNumber = typeof currentTrader.paymentPercent === 'number' 
        ? currentTrader.paymentPercent 
        : parseFloat(currentTrader.paymentPercent.toString());
      const percentDifference = (data.paymentPercent as number) - currentPercentNumber;
      
      // Validate against the new total
      await this.validateTotalPaymentPercent(percentDifference, id);
    }

    // If name is changed, update the slug accordingly
    if (data.name && typeof data.name === 'string') {
      data.slug = data.name.toLowerCase().replace(/ /g, '-');
    }

    return this.prisma.trader.update({
      where: { id },
      data,
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
      const traderPercent = typeof trader.paymentPercent === 'number'
        ? trader.paymentPercent
        : parseFloat(trader.paymentPercent.toString());
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

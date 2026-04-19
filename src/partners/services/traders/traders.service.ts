// src/partners/services/traders/traders.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TradersService {
  constructor(private prisma: PrismaService) {}

  // Create a new trader
  async create(name: string, paymentPercent: number = 0) {
    const existing = await this.prisma.trader.findUnique({ where: { name } });
    if (existing) throw new ConflictException(`Trader with name ${name} already exists`);

    return this.prisma.trader.create({
      data: {
        name,
        paymentPercent,
        slug: name.toLowerCase().replace(/ /g, '-'),
      },
    });
  }

  // Get all traders
  async findAll() {
    return this.prisma.trader.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Find one by ID or Slug
  async findOne(idOrSlug: string | number) {
    const trader = await this.prisma.trader.findFirst({
      where: typeof idOrSlug === 'number' ? { id: idOrSlug } : { slug: idOrSlug },
    });

    if (!trader) throw new NotFoundException(`Trader not found`);
    return trader;
  }

  // Update trader details
  async update(id: number, data: Partial<Prisma.TraderUpdateInput>) {
    // If name is changed, update the slug accordingly
    if (data.name && typeof data.name === 'string') {
      data.slug = data.name.toLowerCase().replace(/ /g, '-');
    }

    return this.prisma.trader.update({
      where: { id },
      data,
    });
  }

  // Remove a trader
  // Note: Will fail if the trader has active stock or classifications (Foreign Key protection)
  async remove(id: number) {
    return this.prisma.trader.delete({
      where: { id },
    });
  }
}

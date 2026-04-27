// src/partners/services/traders/traders.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@Injectable()
export class TradersService {
  constructor(private prisma: PrismaService) {}

  // Create a new trader
  async create(name: string, paymentPercent: number = 33.33) {
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

  // Get all traders. Worker receives only id and name.
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

  // Find one by ID or Slug. Worker receives only id and name.
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

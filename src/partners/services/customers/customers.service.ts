// src/partners/services/customers/customers.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // Create a new customer
  async create(data: { customerName: string; email?: string; phone?: string }) {
    const existing = await this.prisma.customer.findUnique({
      where: { customerName: data.customerName },
    });
    if (existing) throw new ConflictException(`Customer ${data.customerName} already exists`);

    return this.prisma.customer.create({
      data: {
        ...data,
        slug: data.customerName.toLowerCase().replace(/ /g, '-'),
      },
    });
  }

  // Get all customers. Editor receives only id and customerName.
  async findAllByActor(actor: AuthenticatedUser) {
    const isManagerOrAbove = actor.role === Role.MANAGER || actor.role === Role.OWNER;

    if (!isManagerOrAbove) {
      return this.prisma.customer.findMany({
        select: { id: true, customerName: true },
        orderBy: { customerName: 'asc' },
      });
    }

    return this.prisma.customer.findMany({
      orderBy: { customerName: 'asc' },
    });
  }

  // Find one by ID or Slug. Editor receives only id and customerName.
  async findOneByActor(idOrSlug: string | number, actor: AuthenticatedUser) {
    const isManagerOrAbove = actor.role === Role.MANAGER || actor.role === Role.OWNER;

    const customer = await this.prisma.customer.findFirst({
      where: typeof idOrSlug === 'number' ? { id: idOrSlug } : { slug: idOrSlug },
      ...(isManagerOrAbove ? {} : { select: { id: true, customerName: true } }),
    });

    if (!customer) throw new NotFoundException(`Customer not found`);
    return customer;
  }

  // Update customer details
  async update(id: number, data: Partial<Prisma.CustomerUpdateInput>) {
    // Update slug if name changes
    if (data.customerName && typeof data.customerName === 'string') {
      data.slug = data.customerName.toLowerCase().replace(/ /g, '-');
    }

    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  // Remove a customer
  // Protection: Prisma will block this if there are associated allocations/shipments
  async remove(id: number) {
    return this.prisma.customer.delete({
      where: { id },
    });
  }
}

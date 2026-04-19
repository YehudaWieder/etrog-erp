// src/partners/services/customers/customers.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

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

  // Get all customers
  async findAll() {
    return this.prisma.customer.findMany({
      orderBy: { customerName: 'asc' },
    });
  }

  // Find one by ID or Slug
  async findOne(idOrSlug: string | number) {
    const customer = await this.prisma.customer.findFirst({
      where: typeof idOrSlug === 'number' ? { id: idOrSlug } : { slug: idOrSlug },
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

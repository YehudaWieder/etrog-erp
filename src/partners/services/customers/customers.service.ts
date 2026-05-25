// src/partners/services/customers/customers.service.ts

import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

type CustomerWriteInput = {
  customerName?: string;
  email?: string | null;
  phone?: string | null;
};

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly phoneRegex = /^\+?[0-9]{7,15}$/;

  private sanitizeCustomerWriteInput(data: CustomerWriteInput): CustomerWriteInput {
    const sanitized: CustomerWriteInput = { ...data };

    if (typeof sanitized.customerName === 'string') {
      sanitized.customerName = sanitized.customerName.trim();
    }

    if (typeof sanitized.email === 'string') {
      const normalizedEmail = sanitized.email.trim().toLowerCase();
      sanitized.email = normalizedEmail === '' ? null : normalizedEmail;
    }

    if (typeof sanitized.phone === 'string') {
      const normalizedPhone = sanitized.phone.trim().replace(/[\s\-()]/g, '');
      sanitized.phone = normalizedPhone === '' ? null : normalizedPhone;
    }

    return sanitized;
  }

  private validateCustomerWriteInput(data: CustomerWriteInput): void {
    if (typeof data.customerName === 'string' && data.customerName === '') {
      throw new BadRequestException('customerName cannot be empty');
    }

    if (typeof data.email === 'string' && !this.emailRegex.test(data.email)) {
      throw new BadRequestException('email is not valid');
    }

    if (typeof data.phone === 'string' && !this.phoneRegex.test(data.phone)) {
      throw new BadRequestException('phone is not valid');
    }
  }

  // Create a new customer
  async create(data: { customerName: string; email?: string | null; phone?: string | null }) {
    const sanitizedData = this.sanitizeCustomerWriteInput(data);
    this.validateCustomerWriteInput(sanitizedData);

    const customerName = sanitizedData.customerName;

    if (!customerName) {
      throw new BadRequestException('customerName is required');
    }

    const existing = await this.prisma.customer.findUnique({
      where: { customerName },
    });
    if (existing) throw new ConflictException(`Customer ${customerName} already exists`);

    return this.prisma.customer.create({
      data: {
        customerName,
        email: sanitizedData.email ?? undefined,
        phone: sanitizedData.phone ?? undefined,
        slug: customerName.toLowerCase().replace(/ /g, '-'),
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
  async update(id: number, data: CustomerWriteInput) {
    const sanitizedData = this.sanitizeCustomerWriteInput(data);
    this.validateCustomerWriteInput(sanitizedData);

    const updateData: CustomerWriteInput = { ...sanitizedData };

    // Update slug if name changes
    if (updateData.customerName && typeof updateData.customerName === 'string') {
      const customerName = updateData.customerName;
      return this.prisma.customer.update({
        where: { id },
        data: {
          ...updateData,
          slug: customerName.toLowerCase().replace(/ /g, '-'),
        },
      });
    }

    return this.prisma.customer.update({
      where: { id },
      data: updateData,
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

// src/partners/services/customers/customers.service.ts

import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  createCustomerSlug,
  CustomerWriteInput,
  isManagerOrAbove,
  sanitizeCustomerWriteInput,
  validateCustomerWriteInput,
} from './utils/customers.utils';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // Create a new customer
  async create(data: CreateCustomerDto) {
    const sanitizedData = sanitizeCustomerWriteInput(data);
    validateCustomerWriteInput(sanitizedData);

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
        slug: createCustomerSlug(customerName),
      },
    });
  }

  // Get all customers. Editor receives only id and customerName.
  async findAllByActor(actor: AuthenticatedUser) {
    const allowFullView = isManagerOrAbove(actor);

    if (!allowFullView) {
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
    const allowFullView = isManagerOrAbove(actor);

    const customer = await this.prisma.customer.findFirst({
      where: typeof idOrSlug === 'number' ? { id: idOrSlug } : { slug: idOrSlug },
      ...(allowFullView ? {} : { select: { id: true, customerName: true } }),
    });

    if (!customer) throw new NotFoundException(`Customer not found`);
    return customer;
  }

  // Update customer details
  async update(data: UpdateCustomerDto) {
    const { id, ...payload } = data;
    const sanitizedData = sanitizeCustomerWriteInput(payload);
    validateCustomerWriteInput(sanitizedData);

    const updateData: CustomerWriteInput = { ...sanitizedData };

    // Update slug if name changes
    if (updateData.customerName && typeof updateData.customerName === 'string') {
      const customerName = updateData.customerName;
      return this.prisma.customer.update({
        where: { id },
        data: {
          ...updateData,
          slug: createCustomerSlug(customerName),
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
    try {
      return await this.prisma.customer.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete customer because related records exist in the system.');
      }

      throw error;
    }
  }
}

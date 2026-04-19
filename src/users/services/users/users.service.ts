// src/users/services/users/users.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;

  constructor(private prisma: PrismaService) {}

  // Create a new user with hashed password and slug
  async createUser(data: Prisma.UserCreateInput) {
    // Check if email or name exists
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { name: data.name }] },
    });
    if (existing) throw new ConflictException('User with this email or name already exists');

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.passwordHash, this.saltRounds);

    // Generate slug from name
    const slug = data.name.toLowerCase().replace(/ /g, '-');

    return this.prisma.user.create({
      data: {
        ...data,
        passwordHash: hashedPassword,
        slug,
      },
    });
  }

  // Get all users (excluding password hashes for safety)
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        slug: true,
        createdAt: true,
      },
    });
  }

  // Find single user by ID, Email or Slug
  async findOne(identifier: { id?: number; email?: string; slug?: string }) {
    const user = await this.prisma.user.findUnique({
      where: identifier as Prisma.UserWhereUniqueInput,
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Update user details
  async updateUser(id: number, data: Partial<Prisma.UserUpdateInput>) {
    // If password is being updated, hash it
    if (data.passwordHash && typeof data.passwordHash === 'string') {
      data.passwordHash = await bcrypt.hash(data.passwordHash, this.saltRounds);
    }

    // If name is updated, update slug too
    if (data.name && typeof data.name === 'string') {
      data.slug = (data.name as string).toLowerCase().replace(/ /g, '-');
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // Soft delete / Deactivate
  async toggleStatus(id: number, isActive: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
    });
  }

  // Remove user (Note: This will fail if user has related records like shipments)
  async remove(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
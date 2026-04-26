// src/users/services/users/users.service.ts

import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

type SelfUpdateInput = {
  name?: string;
  email?: string;
  phone?: string | null;
  currentPassword?: string;
  newPassword?: string;
};

type AdminUpdateInput = {
  role?: Role;
  isActive?: boolean;
};

type UpdateUserByActorInput = SelfUpdateInput & AdminUpdateInput;

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  constructor(private prisma: PrismaService) {}

  // Create a new user with hashed password and slug
  async createUser(data: Prisma.UserCreateInput) {
    this.assertEmailFormat(data.email);
    this.assertPasswordFormat(data.passwordHash);

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

  async updateUserByActor(id: number, data: UpdateUserByActorInput, actor: AuthenticatedUser) {
    if (!actor) {
      throw new ForbiddenException('Authenticated user context is missing.');
    }

    if (actor.id === id) {
      return this.updateOwnProfile(id, data);
    }

    if (actor.role === Role.OWNER || actor.role === Role.MANAGER) {
      return this.updateByManagement(id, data);
    }

    throw new ForbiddenException('You can only update your own profile.');
  }

  private async updateOwnProfile(id: number, data: UpdateUserByActorInput) {
    const { currentPassword, newPassword, role, isActive, ...profileFields } = data;

    if (role !== undefined || isActive !== undefined) {
      throw new ForbiddenException('You are not allowed to update role or isActive on your own account.');
    }

    if (profileFields.email !== undefined) {
      this.assertEmailFormat(profileFields.email);
    }

    const updateData: Prisma.UserUpdateInput = { ...profileFields };

    if (newPassword !== undefined) {
      this.assertPasswordFormat(newPassword);

      if (!currentPassword) {
        throw new BadRequestException('currentPassword is required to change password.');
      }

      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new ForbiddenException('Current password is incorrect.');
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
    }

    if (updateData.name && typeof updateData.name === 'string') {
      updateData.slug = updateData.name.toLowerCase().replace(/ /g, '-');
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  private async updateByManagement(id: number, data: UpdateUserByActorInput) {
    const { role, isActive } = data;

    const hasUnexpectedFields =
      data.name !== undefined ||
      data.email !== undefined ||
      data.phone !== undefined ||
      data.currentPassword !== undefined ||
      data.newPassword !== undefined;

    if (hasUnexpectedFields) {
      throw new ForbiddenException('Manager/Owner can only update role and isActive.');
    }

    if (role === undefined && isActive === undefined) {
      throw new BadRequestException('At least one of role or isActive must be provided.');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
  }

  private assertEmailFormat(email: string) {
    if (!this.emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format.');
    }
  }

  private assertPasswordFormat(password: string) {
    if (!this.passwordRegex.test(password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters long and include letters and numbers.',
      );
    }
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
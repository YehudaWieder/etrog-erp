import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../interfaces/authenticated-user.interface';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async me(authenticatedUser: AuthenticatedUser) {
    return this.prisma.user.findUnique({
      where: { id: authenticatedUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  logout(authenticatedUser: AuthenticatedUser) {
    return {
      message: 'Logged out successfully. Remove the Bearer token on the client side.',
      userId: authenticatedUser.id,
    };
  }
}

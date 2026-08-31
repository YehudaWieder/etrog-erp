import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupabaseService } from '../../../supabase/supabase.service';
import { AuthenticatedUser } from '../../interfaces/authenticated-user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

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

  async logout(authenticatedUser: AuthenticatedUser, token: string) {
    // Revoke the refresh token at Supabase itself, otherwise a stolen refresh
    // token could mint a fresh access token (new `iat`) that would sail past
    // the sessionsInvalidatedAt check below.
    await this.supabase.adminAuth.signOut(token, 'global');

    await this.prisma.user.update({
      where: { id: authenticatedUser.id },
      data: { sessionsInvalidatedAt: new Date() },
    });

    return {
      message: 'Logged out successfully. All existing access and refresh tokens for this user are now revoked.',
      userId: authenticatedUser.id,
    };
  }
}

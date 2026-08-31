import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { decode } from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../../authorization/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
// Avoid writing lastActiveAt on every single request; a per-user heartbeat
// this coarse is still far tighter than the 1-hour timeout it enforces.
const ACTIVITY_UPDATE_THROTTLE_MS = 60 * 1000;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('No token provided.');

    const {
      data: { user: supabaseUser },
      error,
    } = await this.supabase.getUser(token);

    if (error || !supabaseUser)
      throw new UnauthorizedException('Invalid or expired token.');

    const user = await this.prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        sessionsInvalidatedAt: true,
        lastActiveAt: true,
      },
    });

    if (!user) throw new UnauthorizedException('User profile not found.');

    if (
      user.sessionsInvalidatedAt &&
      this.isTokenIssuedBefore(token, user.sessionsInvalidatedAt)
    ) {
      throw new UnauthorizedException(
        'Session has been revoked. Please log in again.',
      );
    }

    const now = Date.now();
    if (
      user.lastActiveAt &&
      now - user.lastActiveAt.getTime() > INACTIVITY_TIMEOUT_MS
    ) {
      throw new UnauthorizedException(
        'Session expired due to inactivity. Please log in again.',
      );
    }

    if (
      !user.lastActiveAt ||
      now - user.lastActiveAt.getTime() > ACTIVITY_UPDATE_THROTTLE_MS
    ) {
      this.prisma.user
        .update({
          where: { id: user.id },
          data: { lastActiveAt: new Date(now) },
        })
        .catch(() => undefined);
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
    return true;
  }

  // Supabase's getUser() already verified the signature; we only decode the
  // payload here to read `iat` and compare it against sessionsInvalidatedAt.
  private isTokenIssuedBefore(token: string, cutoff: Date): boolean {
    const payload = decode(token);
    const issuedAt =
      typeof payload === 'object' && payload?.iat ? payload.iat * 1000 : 0;
    return issuedAt < cutoff.getTime();
  }

  private extractToken(request: Request): string | undefined {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    return auth.slice(7);
  }
}

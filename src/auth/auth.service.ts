import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validateJwtPayload(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || user.email !== payload.email) {
      throw new UnauthorizedException('Token user is invalid.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
  }
}

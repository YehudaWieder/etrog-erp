import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (user?.role === Role.WORKER && !this.isWorkerProfileRoute(request)) {
      throw new ForbiddenException('Worker accounts are limited to profile endpoints only.');
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!user) {
      throw new UnauthorizedException('User is not authenticated.');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role permissions.');
    }

    return true;
  }

  private isWorkerProfileRoute(request: Request): boolean {
    const path = request.path;
    const method = request.method.toUpperCase();

    if (path === '/messages' || path.startsWith('/messages/')) {
      return true;
    }

    if (method === 'GET' && path === '/auth/me') {
      return true;
    }

    if (method === 'POST' && path === '/auth/logout') {
      return true;
    }

    if (method === 'PATCH' && path === '/users') {
      return true;
    }

    if (method === 'GET' && path === '/users') {
      return true;
    }

    if (method === 'GET' && /^\/users\/[^/]+$/.test(path)) {
      return true;
    }

    if (method === 'DELETE' && /^\/users\/[^/]+$/.test(path)) {
      return true;
    }

    return false;
  }
}

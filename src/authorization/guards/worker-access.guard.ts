import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { isWorkerAllowedRoute } from '../policies/worker-access.policy';

type RequestWithUser = Request & {
  user?: {
    role?: Role;
  };
};

@Injectable()
export class WorkerAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || user.role !== Role.WORKER) {
      return true;
    }

    if (!isWorkerAllowedRoute(request)) {
      throw new ForbiddenException(
        'Worker accounts are limited to profile endpoints only.',
      );
    }

    return true;
  }
}

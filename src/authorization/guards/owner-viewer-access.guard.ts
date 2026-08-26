import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { isOwnerViewerAllowedRoute } from '../policies/owner-viewer-access.policy';

type RequestWithUser = Request & {
  user?: {
    role?: Role;
  };
};

@Injectable()
export class OwnerViewerAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || user.role !== Role.OWNER_VIEWER) {
      return true;
    }

    if (!isOwnerViewerAllowedRoute(request)) {
      throw new ForbiddenException(
        'Owner-viewer accounts have read-only access to Italy data only.',
      );
    }

    return true;
  }
}

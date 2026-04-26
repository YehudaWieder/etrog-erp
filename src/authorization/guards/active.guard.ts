import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ActiveGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Express.Request>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User is not authenticated.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Inactive users are not allowed to access this resource.');
    }

    return true;
  }
}

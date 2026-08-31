import { Controller, Get, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { AuthService } from '../services/auth/auth.service';

@ApiTags('Auth')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Supabase token is missing, invalid, or expired.',
})
@ApiForbiddenResponse({
  description: 'Access denied due to insufficient role or inactive user.',
})
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Authenticated user profile returned.' })
  me(@Req() req: Request) {
    return this.authService.me(req.user as AuthenticatedUser);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke the current access and refresh tokens' })
  @ApiResponse({ status: 200, description: 'Logout acknowledged; tokens revoked.' })
  logout(@Req() req: Request) {
    const token = req.headers.authorization?.slice('Bearer '.length) ?? '';
    return this.authService.logout(req.user as AuthenticatedUser, token);
  }
}

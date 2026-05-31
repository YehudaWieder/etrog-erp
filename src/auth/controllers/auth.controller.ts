import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../authorization/decorators/public.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { AuthService } from '../services/auth/auth.service';
import { LoginDto } from '../services/auth/dto/login.dto';

@ApiTags('Auth')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'JWT authentication failed or token is missing.',
})
@ApiForbiddenResponse({
  description: 'Access denied due to insufficient role or inactive user.',
})
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Login with email and password and receive JWT access token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'owner@etrog-erp.com',
        },
        password: { type: 'string', example: 'Password123' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns JWT access token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user profile from JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Authenticated user profile returned.',
  })
  me(@Req() req: Request) {
    return this.authService.me(req.user as AuthenticatedUser);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout current user (JWT stateless logout acknowledgment)',
  })
  @ApiResponse({ status: 200, description: 'Logout acknowledged.' })
  logout(@Req() req: Request) {
    return this.authService.logout(req.user as AuthenticatedUser);
  }
}

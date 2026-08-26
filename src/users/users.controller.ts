import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { Public } from 'src/authorization/decorators/public.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { SupabaseService } from 'src/supabase/supabase.service';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { parseUserIdOrSlug } from './utils/users.utils';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Supabase token is missing, invalid, or expired.',
})
@ApiForbiddenResponse({
  description: 'Access denied due to insufficient role or inactive user.',
})
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly supabase: SupabaseService,
  ) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: 'Create user profile after Supabase signup. Requires valid Supabase Bearer token.',
  })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      default: {
        summary: 'Create user payload',
        value: {
          name: 'warehouse_manager',
          phone: '0541112233',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User profile created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate name/phone.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Supabase token.' })
  async create(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    const token = req.headers.authorization?.slice(7);
    if (!token) throw new UnauthorizedException('No token provided.');

    const { data: { user }, error } = await this.supabase.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid or expired token.');

    return this.usersService.createUser({
      supabaseId: user.id,
      name: createUserDto.name,
      email: user.email!,
      phone: createUserDto.phone,
    });
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR, Role.WORKER, Role.OWNER_VIEWER)
  @ApiOperation({ summary: 'Retrieve a list of all system users' })
  @ApiResponse({
    status: 200,
    description: 'Users list returned successfully (manager+: full details, editor/worker: names only).',
  })
  findAll(@Req() req: Request) {
    return this.usersService.findAllByActor(req.user as AuthenticatedUser);
  }

  @Get(':idOrSlug')
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR, Role.WORKER, Role.OWNER_VIEWER)
  @ApiOperation({
    summary: 'Retrieve a single user by ID or slug (manager/owner or the user themself)',
  })
  @ApiParam({
    name: 'idOrSlug',
    type: String,
    description: 'The numeric ID or unique slug identifier of the user.',
  })
  @ApiResponse({ status: 200, description: 'User returned successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('idOrSlug') idOrSlug: string, @Req() req: Request) {
    return this.usersService.findOneByActor(
      parseUserIdOrSlug(idOrSlug),
      req.user as AuthenticatedUser,
    );
  }

  @Patch()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR, Role.WORKER, Role.OWNER_VIEWER)
  @ApiOperation({ summary: "Update a user's name, phone, role, or isActive status" })
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      selfUpdate: {
        summary: 'Self profile update',
        value: { id: 1, name: 'new_name', phone: '0541112233' },
      },
      adminUpdate: {
        summary: 'Admin update (role/isActive only)',
        value: { id: 2, role: 'MANAGER', isActive: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(@Body() updateData: UpdateUserDto, @Req() req: Request) {
    return this.usersService.updateUserByActor(
      updateData.id,
      updateData,
      req.user as AuthenticatedUser,
    );
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR, Role.WORKER, Role.OWNER_VIEWER)
  @ApiOperation({
    summary: 'Remove a user by ID (manager/owner or the user themself)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'The numeric ID of the user to delete.',
  })
  @ApiResponse({ status: 200, description: 'User removed successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 409, description: 'Cannot delete user because dependent records still exist.' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.usersService.removeByActor(id, req.user as AuthenticatedUser);
  }
}

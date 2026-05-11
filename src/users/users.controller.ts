import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { UserSwaggerDto, UserUpdateSwaggerDto } from 'src/docs/dto/swagger-enums.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UsersService } from './users.service';

type CreateUserRequestBody = {
	name: string;
	email: string;
	phone?: string;
	password: string;
};

@ApiTags('Users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new system user. Unique constraints: [name], [email], [phone].' })
	@ApiBody({
		type: UserSwaggerDto,
		examples: {
			default: {
				summary: 'Create user payload',
				value: {
					name: 'warehouse_manager',
					email: 'manager@etrog-erp.com',
					phone: '0541112233',
					password: 'StrongPass123!',
				},
			},
		},
	})
	@ApiResponse({ status: 201, description: 'User created successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid input, forbidden fields (role/isActive), or duplicate name/email/phone.' })
	@Public()
	create(@Body() createUserDto: CreateUserRequestBody) {
		return this.usersService.createUser(createUserDto);
	}

	@Get()
	@ApiOperation({ summary: 'Retrieve a list of all system users' })
	@ApiResponse({ status: 200, description: 'Users list returned successfully (manager+: full details, worker: names only).' })
	findAll(@Req() req: Request) {
		return this.usersService.findAllByActor(req.user as AuthenticatedUser);
	}

	@Get(':idOrSlug')
	@ApiOperation({ summary: 'Retrieve a single user by ID or slug (manager/owner or the user themself)' })
	@ApiParam({ name: 'idOrSlug', type: String, description: 'The numeric ID or unique slug identifier of the user.' })
	@ApiResponse({ status: 200, description: 'User returned successfully.' })
	@ApiResponse({ status: 404, description: 'User not found.' })
	@ApiResponse({ status: 403, description: 'You can only access your own user unless you are manager/owner.' })
	findOne(@Param('idOrSlug') idOrSlug: string, @Req() req: Request) {
		const parsedId = Number.parseInt(idOrSlug, 10);
		const identifier = Number.isNaN(parsedId) ? idOrSlug : parsedId;
		return this.usersService.findOneByActor(identifier, req.user as AuthenticatedUser);
	}

	@Patch()
	@ApiOperation({ summary: 'Update a user\'s details by ID' })
	@ApiBody({
		type: UserUpdateSwaggerDto,
		examples: {
			sample: {
				summary: 'Update a user by ID',
				value: {
					id: 1,
					name: 'warehouse_manager',
					email: 'manager@etrog-erp.com',
					currentPassword: 'OldPassword123!',
					newPassword: 'NewPassword123!',
					role: 'MANAGER',
					isActive: true,
				},
			},
		},
	})
	@ApiResponse({ status: 200, description: 'User updated successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid update data.' })
	@ApiResponse({ status: 404, description: 'User not found.' })
	update(
		@Body() updateData: UserUpdateSwaggerDto,
		@Req() req: Request,
	) {
		return this.usersService.updateUserByActor(updateData.id, updateData, req.user as AuthenticatedUser);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Remove a user by ID (manager/owner or the user themself)' })
	@ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the user to delete.' })
	@ApiResponse({ status: 200, description: 'User removed successfully.' })
	@ApiResponse({ status: 404, description: 'User not found.' })
	@ApiResponse({ status: 403, description: 'You can only remove your own user unless you are manager/owner.' })
	remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
		return this.usersService.removeByActor(id, req.user as AuthenticatedUser);
	}
}

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { UserSwaggerDto } from 'src/docs/dto/swagger-enums.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UsersService } from './users.service';

type UpdateUserRequestBody = {
	name?: string;
	email?: string;
	phone?: string | null;
	currentPassword?: string;
	newPassword?: string;
	role?: Role;
	isActive?: boolean;
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
	@ApiBody({ type: UserSwaggerDto })
	@ApiResponse({ status: 201, description: 'User created successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid input or duplicate name/email/phone.' })
	@Public()
	create(@Body() createUserDto: Prisma.UserCreateInput) {
		return this.usersService.createUser(createUserDto);
	}

	@Get()
	@ApiOperation({ summary: 'Retrieve a list of all system users' })
	@ApiResponse({ status: 200, description: 'List of users returned successfully.' })
	findAll() {
		return this.usersService.findAll();
	}

	@Get(':slug')
	@ApiOperation({ summary: 'Retrieve a single user by their URL-friendly slug' })
	@ApiParam({ name: 'slug', type: String, description: 'The unique slug identifier of the user.' })
	@ApiResponse({ status: 200, description: 'User returned successfully.' })
	@ApiResponse({ status: 404, description: 'User not found.' })
	findOne(@Param('slug') slug: string) {
		return this.usersService.findOne({ slug });
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update a user\'s details by ID' })
	@ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the user to update.' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				name: { type: 'string', example: 'warehouse_manager' },
				email: { type: 'string', format: 'email', example: 'manager@etrog-erp.com' },
				phone: { type: 'string', example: '0541112233' },
				currentPassword: { type: 'string', example: 'OldPassword123!' },
				newPassword: { type: 'string', example: 'NewPassword123!' },
				role: { type: 'string', enum: ['OWNER', 'MANAGER', 'WORKER'], example: 'MANAGER' },
				isActive: { type: 'boolean', example: true },
			},
			example: {
				name: 'warehouse_manager',
				email: 'manager@etrog-erp.com',
				currentPassword: 'OldPassword123!',
				newPassword: 'NewPassword123!',
				role: 'MANAGER',
				isActive: true,
			},
		},
	})
	@ApiResponse({ status: 200, description: 'User updated successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid update data.' })
	@ApiResponse({ status: 404, description: 'User not found.' })
	update(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateData: UpdateUserRequestBody,
		@Req() req: Request,
	) {
		return this.usersService.updateUserByActor(id, updateData, req.user as AuthenticatedUser);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Deactivate or remove a user by ID' })
	@ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the user to delete.' })
	@ApiResponse({ status: 200, description: 'User removed successfully.' })
	@ApiResponse({ status: 404, description: 'User not found.' })
	remove(@Param('id', ParseIntPipe) id: number) {
		return this.usersService.remove(id);
	}
}

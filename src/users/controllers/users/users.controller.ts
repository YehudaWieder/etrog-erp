// src/users/controllers/users/users.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsersService } from '../../services/users/users.service';
import { Prisma } from '@prisma/client';
import { UserSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new system user. Unique constraints: [name], [email], [phone].' })
  @ApiBody({ type: UserSwaggerDto })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate name/email/phone.' })
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
        role: { type: 'string', enum: ['OWNER', 'MANAGER', 'WORKER'], example: 'MANAGER' },
        isActive: { type: 'boolean', example: true },
      },
      example: {
        name: 'warehouse_manager',
        email: 'manager@etrog-erp.com',
        role: 'MANAGER',
        isActive: true,
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateData: any) {
    return this.usersService.updateUser(id, updateData);
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
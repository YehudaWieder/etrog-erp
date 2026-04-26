// src/system-config/controllers/fields/fields.controller.ts

import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FieldService } from 'src/system-config/services/fields/fields.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { ActiveGuard } from 'src/authorization/guards/active.guard';
import { Roles } from 'src/authorization/decorators/roles.decorator';

@ApiTags('System Configuration')
@Controller('fields')
export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve a list of all registered harvest fields' })
  @ApiResponse({ status: 200, description: 'List of fields returned successfully.' })
  getAllFields() {
    return this.fieldService.getAllFields();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
  @ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
  @ApiOperation({ summary: 'Register a new harvest field. Unique constraint: [name].' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'The unique name of the field.' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Field created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate field name.' })
  addField(@Body() body: { name: string }) {
    return this.fieldService.addField(body.name);
  }

  @Delete(':name')
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
  @ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
  @ApiOperation({ summary: 'Remove a harvest field by its name' })
  @ApiParam({ name: 'name', type: String, description: 'The name of the field to remove.' })
  @ApiResponse({ status: 200, description: 'Field removed successfully.' })
  @ApiResponse({ status: 404, description: 'Field not found.' })
  removeField(@Param('name') name: string) {
    return this.fieldService.removeField(name);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
  @ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
  @ApiOperation({ summary: 'Rename an existing harvest field' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['oldName', 'newName'],
      properties: {
        oldName: { type: 'string', description: 'The current name of the field.' },
        newName: { type: 'string', description: 'The new name for the field.' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Field renamed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate new field name.' })
  @ApiResponse({ status: 404, description: 'Field with the given name not found.' })
  updateField(@Body() body: { oldName: string; newName: string }) {
    return this.fieldService.updateFieldName(body.oldName, body.newName);
  }
}

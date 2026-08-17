// src/israel/settings/controllers/fields/fields.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Req,
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
import { Request } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { IsraelFieldsService } from 'src/israel/settings/services/fields/fields.service';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { CreateIsraelFieldDto } from 'src/israel/settings/services/fields/dto/create-israel-field.dto';
import { UpdateIsraelFieldDto } from 'src/israel/settings/services/fields/dto/update-israel-field.dto';

@ApiTags('Israel Settings')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'JWT authentication failed or token is missing.',
})
@ApiForbiddenResponse({
  description: 'Access denied due to insufficient role or inactive user.',
})
@Roles(Role.OWNER, Role.MANAGER)
@Controller('israel/fields')
export class IsraelFieldsController {
  constructor(private readonly israelFieldsService: IsraelFieldsService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve a list of all registered Israel sellers/fields' })
  @ApiResponse({
    status: 200,
    description: 'List of Israel fields returned successfully.',
  })
  getAllFields() {
    return this.israelFieldsService.getAllFields();
  }

  @Post()
  @ApiOperation({
    summary: 'Register a new Israel seller/field. Unique constraint: [name].',
  })
  @ApiBody({
    type: CreateIsraelFieldDto,
    examples: {
      sample: {
        summary: 'Create a new Israel field',
        value: {
          name: 'Moshe Cohen',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Israel field created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate field name.',
  })
  addField(@Body() body: CreateIsraelFieldDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelFieldsService.addField(body.name, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an Israel seller/field by its ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'The numeric ID of the Israel field to remove.',
  })
  @ApiResponse({ status: 200, description: 'Israel field removed successfully.' })
  @ApiResponse({ status: 404, description: 'Israel field not found.' })
  removeField(@Param('id', ParseIntPipe) id: number) {
    return this.israelFieldsService.removeField(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Rename an existing Israel seller/field by ID' })
  @ApiBody({
    type: UpdateIsraelFieldDto,
    examples: {
      sample: {
        summary: 'Rename an Israel field by ID',
        value: {
          id: 1,
          name: 'Moshe Cohen',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Israel field renamed successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate new field name.',
  })
  @ApiResponse({
    status: 404,
    description: 'Israel field with the given ID not found.',
  })
  updateField(@Body() body: UpdateIsraelFieldDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelFieldsService.updateField(body.id, body.name, actor.id);
  }
}

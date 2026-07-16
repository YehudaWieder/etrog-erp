// src/system-config/controllers/fields/fields.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
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
import { FieldService } from 'src/system-config/services/fields/fields.service';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { FieldCreateDto } from 'src/system-config/services/fields/dto/field-create.dto';
import { FieldUpdateDto } from 'src/system-config/services/fields/dto/field-update.dto';

@ApiTags('System Configuration')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'JWT authentication failed or token is missing.',
})
@ApiForbiddenResponse({
  description: 'Access denied due to insufficient role or inactive user.',
})
@Roles(Role.OWNER, Role.MANAGER)
@Controller('fields')
export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve a list of all registered harvest fields' })
  @ApiResponse({
    status: 200,
    description: 'List of fields returned successfully.',
  })
  getAllFields() {
    return this.fieldService.getAllFields();
  }

  @Post()
  @ApiOperation({
    summary: 'Register a new harvest field. Unique constraint: [name].',
  })
  @ApiBody({
    type: FieldCreateDto,
    examples: {
      sample: {
        summary: 'Create a new field',
        value: {
          name: 'Block A',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Field created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate field name.',
  })
  addField(@Body() body: FieldCreateDto) {
    return this.fieldService.addField(body.name, body.includeInRejectionSummary);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a harvest field by its ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'The numeric ID of the field to remove.',
  })
  @ApiResponse({ status: 200, description: 'Field removed successfully.' })
  @ApiResponse({ status: 404, description: 'Field not found.' })
  removeField(@Param('id', ParseIntPipe) id: number) {
    return this.fieldService.removeField(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Rename an existing harvest field by ID' })
  @ApiBody({
    type: FieldUpdateDto,
    examples: {
      sample: {
        summary: 'Rename a field by ID',
        value: {
          id: 1,
          name: 'Block A North',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Field renamed successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate new field name.',
  })
  @ApiResponse({
    status: 404,
    description: 'Field with the given ID not found.',
  })
  updateField(@Body() body: FieldUpdateDto) {
    return this.fieldService.updateFieldName(body.id, body.name, body.includeInRejectionSummary);
  }
}

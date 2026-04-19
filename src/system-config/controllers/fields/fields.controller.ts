// src/system-config/controllers/fields/fields.controller.ts

import {
  Controller, Get, Post, Delete, Patch, Body, Param,} from '@nestjs/common';
import { FieldService } from 'src/system-config/services/fields/fields.service';

@Controller('fields')
export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  // Get all fields
  @Get()
  getAllFields() {
    return this.fieldService.getAllFields();
  }

  // Create field
  @Post()
  addField(@Body() body: { name: string }) {
    return this.fieldService.addField(body.name);
  }

  // Delete field
  @Delete(':name')
  removeField(@Param('name') name: string) {
    return this.fieldService.removeField(name);
  }

  // Update field name
  @Patch()
  updateField(
    @Body() body: { oldName: string; newName: string },
  ) {
    return this.fieldService.updateFieldName(
      body.oldName,
      body.newName,
    );
  }
}
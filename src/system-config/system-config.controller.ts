import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { SystemConfigService } from 'src/system-config/system-config.service';

@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get(':seasonId')
  getConfig(@Param('seasonId', ParseIntPipe) seasonId: number) {
    return this.configService.getConfig(seasonId);
  }

  @Patch(':seasonId')
  updateConfig(
    @Param('seasonId', ParseIntPipe) seasonId: number,
    @Body() updateData: any,
  ) {
    return this.configService.updateConfig(seasonId, updateData);
  }

  @Post(':seasonId/fields')
  addField(
    @Param('seasonId', ParseIntPipe) seasonId: number,
    @Body('fieldName') fieldName: string,
  ) {
    return this.configService.addField(seasonId, fieldName);
  }

  @Delete(':seasonId/fields')
  removeField(
    @Param('seasonId', ParseIntPipe) seasonId: number,
    @Body('fieldName') fieldName: string,
  ) {
    return this.configService.removeField(seasonId, fieldName);
  }
}
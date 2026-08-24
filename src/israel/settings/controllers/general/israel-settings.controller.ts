// src/israel/settings/controllers/general/israel-settings.controller.ts

import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { IsraelSettingsService } from 'src/israel/settings/services/general/israel-settings.service';
import { UpdateIsraelSettingsDto } from 'src/israel/settings/services/general/dto/update-israel-settings.dto';

@ApiTags('Israel Settings')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'JWT authentication failed or token is missing.',
})
@ApiForbiddenResponse({
  description: 'Access denied due to insufficient role or inactive user.',
})
@Controller('israel/settings')
export class IsraelSettingsController {
  constructor(private readonly israelSettingsService: IsraelSettingsService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve the general (season-independent) Israel settings' })
  @ApiResponse({
    status: 200,
    description: 'Israel settings returned successfully.',
  })
  getSettings() {
    return this.israelSettingsService.getSettings();
  }

  @Patch()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update the general (season-independent) Israel settings' })
  @ApiBody({
    type: UpdateIsraelSettingsDto,
    examples: {
      sample: {
        summary: 'Update carton capacity',
        value: { cartonCapacity: 120 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Israel settings updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  updateSettings(@Body() body: UpdateIsraelSettingsDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelSettingsService.updateSettings(body.cartonCapacity, actor.id);
  }
}

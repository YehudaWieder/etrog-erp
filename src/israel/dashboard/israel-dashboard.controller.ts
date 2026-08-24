import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { IsraelDashboardService } from './israel-dashboard.service';

@ApiTags('Israel Dashboard')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('israel/dashboard')
export class IsraelDashboardController {
  constructor(private readonly israelDashboardService: IsraelDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve aggregated Israel dashboard data for a season' })
  @ApiQuery({ name: 'seasonId', type: Number })
  getDashboardData(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.israelDashboardService.getDashboardData(seasonId);
  }
}

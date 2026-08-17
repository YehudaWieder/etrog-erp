import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../authorization/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Roles(Role.OWNER, Role.MANAGER)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type, e.g. "Shipment".' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Filter by entity id.' })
  @ApiQuery({ name: 'take', required: false, description: 'Page size (default 50).' })
  @ApiQuery({ name: 'skip', required: false, description: 'Page offset (default 0).' })
  findMany(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take ? Number(take) : 50,
      skip: skip ? Number(skip) : 0,
    });
  }
}

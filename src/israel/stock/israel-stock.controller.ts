import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { IsraelStockService } from './israel-stock.service';
import { CreateIsraelStockMovementDto } from './dto/create-israel-stock-movement.dto';
import { UpdateIsraelStockMovementDto } from './dto/update-israel-stock-movement.dto';

@ApiTags('Israel Inventory')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'JWT authentication failed or token is missing.',
})
@ApiForbiddenResponse({
  description: 'Access denied due to insufficient role or inactive user.',
})
@Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
@Controller('israel/stock')
export class IsraelStockController {
  constructor(private readonly israelStockService: IsraelStockService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all Israel stock movements for a season' })
  @ApiQuery({ name: 'seasonId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of Israel stock movements returned successfully.',
  })
  findAllBySeason(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.israelStockService.findAllBySeason(seasonId);
  }

  @Post()
  @ApiOperation({
    summary: 'Record a manual Israel stock movement (self-pickup or waste)',
  })
  @ApiResponse({
    status: 201,
    description: 'Israel stock movement created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() body: CreateIsraelStockMovementDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelStockService.createMovement(body, actor.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing manual Israel stock movement' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Israel stock movement updated successfully.',
  })
  @ApiResponse({ status: 404, description: 'Israel stock movement not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateIsraelStockMovementDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser;
    return this.israelStockService.updateMovement(id, body, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a manual Israel stock movement' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Israel stock movement deleted successfully.',
  })
  @ApiResponse({ status: 404, description: 'Israel stock movement not found.' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelStockService.removeMovement(id, actor.id);
  }
}

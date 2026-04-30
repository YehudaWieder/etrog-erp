import { Body, Controller, Delete, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiBody,
	ApiForbiddenResponse,
	ApiOperation,
	ApiParam,
	ApiResponse,
	ApiTags,
	ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InternalTransferRequest, InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('inventory')
export class InventoryController {
	constructor(private readonly inventoryService: InventoryService) {}

	@Post('internal-transfer')
	@ApiOperation({
		summary:
			'Create internal transfer in TX with both sides (minus/plus): INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, ASSIGNED manual.',
	})
	@ApiBody({ type: Object })
	@ApiResponse({ status: 201, description: 'Internal transfer created successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid payload or unsupported owner flow.' })
	create(@Body() data: InternalTransferRequest) {
		return this.inventoryService.createInternalTransfer(data);
	}

	@Patch('internal-transfer/:operationId')
	@ApiOperation({ summary: 'Update internal transfer in TX while preserving minus/plus integrity.' })
	@ApiParam({ name: 'operationId', type: Number })
	@ApiBody({ type: Object })
	@ApiResponse({ status: 200, description: 'Internal transfer updated successfully.' })
	@ApiResponse({ status: 404, description: 'Internal transfer not found.' })
	update(
		@Param('operationId', ParseIntPipe) operationId: number,
		@Body() data: InternalTransferRequest,
	) {
		return this.inventoryService.updateInternalTransfer(operationId, data);
	}

	@Delete('internal-transfer/:operationId')
	@ApiOperation({ summary: 'Soft delete internal transfer in TX on both sides.' })
	@ApiParam({ name: 'operationId', type: Number })
	@ApiResponse({ status: 200, description: 'Internal transfer deleted successfully.' })
	@ApiResponse({ status: 404, description: 'Internal transfer not found.' })
	remove(@Param('operationId', ParseIntPipe) operationId: number) {
		return this.inventoryService.removeInternalTransfer(operationId);
	}
}

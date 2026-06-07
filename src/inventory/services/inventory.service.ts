import { Injectable } from '@nestjs/common';
import { CustomerGeneralTransferService } from 'src/inventory/services/customer-general-transfer/customer-general-transfer.service';
import { InternalTransferRequestDto } from 'src/inventory/services/inventory-core/dto/internal-transfer.dto';
import { CustomerGeneralAllocationRequestDto } from 'src/inventory/services/inventory-core/dto/customer-general-allocation.dto';
import { InternalTransferService } from 'src/inventory/services/internal-transfer/internal-transfer.service';
import { CombinedInventorySummaryQuery } from 'src/inventory/services/inventory-core/dto/combined-inventory-summary.dto';
import { CombinedSummaryService } from 'src/inventory/services/combined-summary/combined-summary.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InventoryService {
	constructor(
		private readonly combinedSummaryService: CombinedSummaryService,
		private readonly internalTransferService: InternalTransferService,
		private readonly customerGeneralTransferService: CustomerGeneralTransferService,
		private readonly prisma: PrismaService,
	) {}

	async createInternalTransfer(data: InternalTransferRequestDto, actorId: number) {
		return this.internalTransferService.create(data, actorId);
	}

	async createCustomerAllocationFromGeneral(data: CustomerGeneralAllocationRequestDto, actorId: number) {
		return this.customerGeneralTransferService.create(data, actorId);
	}

	async updateCustomerAllocationFromGeneral(customerAllocationId: number, data: CustomerGeneralAllocationRequestDto, actorId: number) {
		return this.customerGeneralTransferService.update(
			customerAllocationId,
			data,
			actorId,
		);
	}

	async removeCustomerAllocationFromGeneral(customerAllocationId: number) {
		return this.customerGeneralTransferService.remove(customerAllocationId);
	}

	async updateInternalTransfer(operationId: number, data: InternalTransferRequestDto, actorId: number) {
		return this.internalTransferService.update(operationId, data, actorId);
	}

	async removeInternalTransfer(operationId: number) {
		return this.internalTransferService.remove(operationId);
	}

	async getCombinedSummary(query: CombinedInventorySummaryQuery) {
		return this.combinedSummaryService.getSummary(query);
	}

	async getTraderMovements(params: {
		seasonId?: number | null;
		traderId?: number | null;
		ownerScope?: string;
		shipmentScope?: string;
	}) {
		console.log('[getTraderMovements] Received params:', params);
		
		const where: any = {
			isDeleted: false,
		};

		if (params.seasonId) {
			where.seasonId = params.seasonId;
		}

		// Handle ownerScope filtering
		if (params.ownerScope === 'TRADER') {
			// Show only specific trader movements
			if (params.traderId) {
				where.traderId = params.traderId;
			}
		} else if (params.ownerScope === 'MODULO') {
			// Show only unassigned/modulo movements
			// First, find the "כללי" (General) trader
			const moduloTrader = await this.prisma.trader.findUnique({
				where: { name: 'כללי' },
			});
			
			if (moduloTrader) {
				console.log(`[getTraderMovements] Found כללי trader with ID ${moduloTrader.id}`);
				// Filter for movements from כללי trader OR with traderId=null
				where.OR = [
					{ traderId: moduloTrader.id },
					{ traderId: null },
				];
			} else {
				// If כללי trader doesn't exist, just filter for traderId=null
				console.log('[getTraderMovements] כללי trader not found, filtering for traderId=null only');
				where.traderId = null;
			}
		}
		// If ownerScope is 'ALL' or not provided, show all movements (no additional filter)

		console.log('[getTraderMovements] Query where clause:', JSON.stringify(where, null, 2));

		// Handle shipmentScope filtering
		if (params.shipmentScope === 'SHIPPED') {
			where.type = {
				in: ['PACKED_SHIPPED', 'SELF_PICKUP'],
			};
		} else if (params.shipmentScope === 'UNSHIPPED') {
			where.type = {
				notIn: ['PACKED_SHIPPED', 'SELF_PICKUP'],
			};
		} else if (params.shipmentScope && params.shipmentScope !== 'ALL') {
			// Handle specific movement types like 'PACKED_SHIPPED' or 'SELF_PICKUP'
			where.type = params.shipmentScope;
		}

		const movements = await this.prisma.traderStock.findMany({
			where,
			include: {
				trader: true,
				traderCategory: true,
				updatedBy: true,
			},
			orderBy: {
				date: 'desc',
			},
		});

		console.log(`[getTraderMovements] Query returned ${movements.length} movements`);

		return movements.map((movement) => ({
			id: movement.id,
			date: movement.date.toISOString(),
			type: movement.type,
			traderId: movement.traderId,
			traderName: movement.trader?.name,
			categoryName: movement.traderCategory?.name,
			grade: movement.grade,
			pitamStatus: movement.pitamStatus,
			quantity: movement.quantity,
			isModulo: movement.isModulo,
			notes: movement.notes,
		}));
	}

}

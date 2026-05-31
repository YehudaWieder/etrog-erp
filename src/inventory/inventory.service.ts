import { Injectable } from '@nestjs/common';
import { CustomerGeneralTransferService } from './services/customer-general-transfer/customer-general-transfer.service';
import { InternalTransferRequestDto } from './dto/internal-transfer.dto';
import { CustomerGeneralAllocationRequestDto } from './dto/customer-general-allocation.dto';
import { InternalTransferService } from './services/internal-transfer/internal-transfer.service';
import { CombinedInventorySummaryQuery } from './dto/combined-inventory-summary.dto';
import { CombinedSummaryService } from './services/combined-summary/combined-summary.service';

@Injectable()
export class InventoryService {
	constructor(
		private readonly combinedSummaryService: CombinedSummaryService,
		private readonly internalTransferService: InternalTransferService,
		private readonly customerGeneralTransferService: CustomerGeneralTransferService,
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

}

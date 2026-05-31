import { Injectable } from '@nestjs/common';
import { CustomerGeneralAllocationRequestDto } from 'src/inventory/services/inventory-core/dto/customer-general-allocation.dto';
import { InternalTransferRequestDto } from 'src/inventory/services/inventory-core/dto/internal-transfer.dto';
import {
  validateCustomerGeneralAllocationRequest,
  validateInternalTransferRequest,
} from './transfer-rules';

@Injectable()
export class InventoryValidationService {
  validateInternalTransferDto(data: InternalTransferRequestDto) {
    validateInternalTransferRequest(data);
  }

  validateCustomerGeneralAllocationDto(data: CustomerGeneralAllocationRequestDto) {
    validateCustomerGeneralAllocationRequest(data);
  }
}

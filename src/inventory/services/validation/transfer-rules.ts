import { BadRequestException } from '@nestjs/common';
import { MovementType } from 'src/generated/prisma';
import { CustomerGeneralAllocationRequestDto } from 'src/inventory/dto/customer-general-allocation.dto';
import { InternalTransferRequestDto, InventoryOwnerType } from 'src/inventory/dto/internal-transfer.dto';

export function validateInternalTransferRequest(data: InternalTransferRequestDto) {
  assertSupportedTransferType(data.type);
  assertOwnerFlow(data);

  if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
    throw new BadRequestException('quantity must be a positive number');
  }

  if (!data.date) {
    throw new BadRequestException('date is required');
  }

  if (data.fromOwnerType === InventoryOwnerType.MODULO && data.fromTraderId) {
    throw new BadRequestException('fromTraderId must be empty when fromOwnerType is MODULO');
  }

  if (data.toOwnerType === InventoryOwnerType.MODULO) {
    throw new BadRequestException('toOwnerType MODULO is not supported for transfer target');
  }

  if (data.fromOwnerType === InventoryOwnerType.TRADER && !data.fromTraderId) {
    throw new BadRequestException('fromTraderId is required when fromOwnerType=TRADER');
  }

  if (data.fromOwnerType === InventoryOwnerType.CUSTOMER && !data.fromCustomerId) {
    throw new BadRequestException('fromCustomerId is required when fromOwnerType=CUSTOMER');
  }

  if (data.toOwnerType === InventoryOwnerType.TRADER && !data.toTraderId) {
    throw new BadRequestException('toTraderId is required when toOwnerType=TRADER');
  }

  if (data.toOwnerType === InventoryOwnerType.CUSTOMER && !data.toCustomerId) {
    throw new BadRequestException('toCustomerId is required when toOwnerType=CUSTOMER');
  }
}

export function validateCustomerGeneralAllocationRequest(data: CustomerGeneralAllocationRequestDto) {
  if (!Number.isFinite(data.quantity) || data.quantity <= 0 || !Number.isInteger(data.quantity)) {
    throw new BadRequestException('quantity must be a positive integer');
  }

  if (!data.date) {
    throw new BadRequestException('date is required');
  }

  if (!data.dateHebrew) {
    throw new BadRequestException('dateHebrew is required');
  }

  if (!data.customerId) {
    throw new BadRequestException('customerId is required');
  }

  if (!data.customerCategoryId) {
    throw new BadRequestException('customerCategoryId is required');
  }

  if (!data.traderCategoryId) {
    throw new BadRequestException('traderCategoryId is required');
  }

  if (!data.grade) {
    throw new BadRequestException('grade is required');
  }

  if (!data.pitamStatus) {
    throw new BadRequestException('pitamStatus is required');
  }
}

function assertSupportedTransferType(type: MovementType) {
  switch (type) {
    case MovementType.INTERNAL_TRANSFER:
    case MovementType.OWNERSHIP_TRANSFER:
    case MovementType.ASSIGNED:
      return;
    default:
      throw new BadRequestException(`Unsupported transfer type: ${type}`);
  }
}

function assertOwnerFlow(data: InternalTransferRequestDto) {
  if (data.type === MovementType.INTERNAL_TRANSFER) {
    const valid =
      (data.fromOwnerType === InventoryOwnerType.TRADER && data.toOwnerType === InventoryOwnerType.CUSTOMER) ||
      (data.fromOwnerType === InventoryOwnerType.CUSTOMER && data.toOwnerType === InventoryOwnerType.TRADER);

    if (!valid) {
      throw new BadRequestException('INTERNAL_TRANSFER must be between TRADER and CUSTOMER');
    }
    return;
  }

  if (data.type === MovementType.OWNERSHIP_TRANSFER) {
    if (data.fromOwnerType !== InventoryOwnerType.TRADER || data.toOwnerType !== InventoryOwnerType.TRADER) {
      throw new BadRequestException('OWNERSHIP_TRANSFER must be TRADER -> TRADER');
    }
    if (data.fromTraderId === data.toTraderId) {
      throw new BadRequestException('fromTraderId and toTraderId must be different for OWNERSHIP_TRANSFER');
    }
    return;
  }

  if (data.fromOwnerType !== InventoryOwnerType.MODULO || data.toOwnerType !== InventoryOwnerType.TRADER) {
    throw new BadRequestException('ASSIGNED manual flow must be MODULO -> TRADER');
  }
}

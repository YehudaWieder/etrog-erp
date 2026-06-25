import { BadRequestException } from '@nestjs/common';
import { ItemOwnership, PitamStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export function assertPositiveInt(value: unknown, fieldName: string): void {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new BadRequestException(`${fieldName} must be a positive integer`);
  }
}

export function validateItemOwnership(
  ownershipType: unknown,
  traderId: unknown,
  customerId: unknown,
): void {
  if (ownershipType !== undefined && !Object.values(ItemOwnership).includes(ownershipType as ItemOwnership)) {
    throw new BadRequestException('ownershipType is invalid');
  }

  if (traderId !== undefined && traderId !== null) {
    assertPositiveInt(traderId, 'traderId');
  }

  if (customerId !== undefined && customerId !== null) {
    assertPositiveInt(customerId, 'customerId');
  }

  if (ownershipType === ItemOwnership.TRADER && (traderId === undefined || traderId === null)) {
    throw new BadRequestException('traderId is required when ownershipType=TRADER');
  }

  if (ownershipType === ItemOwnership.CUSTOMER && (customerId === undefined || customerId === null)) {
    throw new BadRequestException('customerId is required when ownershipType=CUSTOMER');
  }

  if (ownershipType === ItemOwnership.GENERAL && (traderId !== undefined && traderId !== null)) {
    throw new BadRequestException('traderId must be empty when ownershipType=GENERAL');
  }

  if (ownershipType === ItemOwnership.GENERAL && (customerId !== undefined && customerId !== null)) {
    throw new BadRequestException('customerId must be empty when ownershipType=GENERAL');
  }

  if (ownershipType !== ItemOwnership.TRADER && ownershipType !== ItemOwnership.CUSTOM && traderId !== undefined && traderId !== null) {
    throw new BadRequestException('traderId must be empty unless ownershipType=TRADER or ownershipType=CUSTOM');
  }

  if (ownershipType !== ItemOwnership.CUSTOMER && ownershipType !== ItemOwnership.CUSTOM && customerId !== undefined && customerId !== null) {
    throw new BadRequestException('customerId must be empty unless ownershipType=CUSTOMER or ownershipType=CUSTOM');
  }
}

export function validateCreateShipmentItemInput(data: Prisma.ShipmentItemUncheckedCreateInput): void {
  assertPositiveInt(data.boxId, 'boxId');
  assertPositiveInt(data.quantity, 'quantity');
  assertPositiveInt(data.updatedById, 'updatedById');

  if (data.shipmentId !== undefined || data.seasonId !== undefined) {
    throw new BadRequestException('shipmentId and seasonId are managed by the server');
  }

  if (!Object.values(PitamStatus).includes(data.pitamStatus as PitamStatus)) {
    throw new BadRequestException('pitamStatus is invalid');
  }

  if (data.traderCategoryId !== undefined && data.traderCategoryId !== null) {
    assertPositiveInt(data.traderCategoryId, 'traderCategoryId');
  }

  if (data.customerCategoryId !== undefined && data.customerCategoryId !== null) {
    assertPositiveInt(data.customerCategoryId, 'customerCategoryId');
  }

  if (data.notes !== undefined && typeof data.notes !== 'string') {
    throw new BadRequestException('notes must be a string');
  }

  if ((data as any).customLabel !== undefined && typeof (data as any).customLabel !== 'string') {
    throw new BadRequestException('customLabel must be a string');
  }

  if ((data as any).customGrade !== undefined && typeof (data as any).customGrade !== 'string') {
    throw new BadRequestException('customGrade must be a string');
  }

  if (data.ownershipType !== undefined) {
    validateItemOwnership(data.ownershipType, data.traderId, data.customerId);
  }
}

export function validateUpdateShipmentItemInput(data: Prisma.ShipmentItemUncheckedUpdateInput): void {
  if (Object.keys(data).length === 0) {
    throw new BadRequestException('At least one shipment item field must be provided for update');
  }

  if (data.shipmentId !== undefined || data.seasonId !== undefined || data.isDeleted !== undefined) {
    throw new BadRequestException('shipmentId, seasonId, and isDeleted cannot be updated here');
  }

  if (data.boxId !== undefined) {
    assertPositiveInt(data.boxId, 'boxId');
  }

  if (data.quantity !== undefined) {
    assertPositiveInt(data.quantity, 'quantity');
  }

  if (data.updatedById !== undefined) {
    assertPositiveInt(data.updatedById, 'updatedById');
  }

  if (data.pitamStatus !== undefined && !Object.values(PitamStatus).includes(data.pitamStatus as PitamStatus)) {
    throw new BadRequestException('pitamStatus is invalid');
  }

  if (data.traderCategoryId !== undefined && data.traderCategoryId !== null) {
    assertPositiveInt(data.traderCategoryId, 'traderCategoryId');
  }

  if (data.customerCategoryId !== undefined && data.customerCategoryId !== null) {
    assertPositiveInt(data.customerCategoryId, 'customerCategoryId');
  }

  if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
    throw new BadRequestException('notes must be a string');
  }
}

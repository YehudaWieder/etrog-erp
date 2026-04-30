import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AssignmentType,
  BoxOwnership,
  BoxStatus,
  BoxType,
  Currency,
  Grade,
  ItemOwnership,
  MovementType,
  PitamStatus,
  Priority,
  Role,
  ShipmentStatus,
  SourceType,
} from '@prisma/client';

export class UserSwaggerDto {
  @ApiProperty({ description: 'Unique display name of the user.' })
  name!: string;

  @ApiProperty({ description: 'Unique email of the user.' })
  email!: string;

  @ApiPropertyOptional({ description: 'Optional unique phone number.' })
  phone?: string;

  @ApiProperty({ description: 'Hashed password value.' })
  passwordHash!: string;

  @ApiPropertyOptional({ enum: Role, enumName: 'Role', description: 'Role assigned to the user.' })
  role?: Role;
}

export class MessageSwaggerDto {
  @ApiProperty({ description: 'Sender user ID.' })
  senderId!: number;

  @ApiProperty({
    type: [Number],
    description: 'Recipient user IDs. Supports one or more users per message.',
    example: [2, 5, 8],
  })
  recipientIds!: number[];

  @ApiProperty({ description: 'Message subject.' })
  subject!: string;

  @ApiProperty({ description: 'Message body content.' })
  content!: string;

  @ApiPropertyOptional({ enum: Priority, enumName: 'Priority', description: 'Message priority level.' })
  priority?: Priority;

  @ApiPropertyOptional({
    type: [Number],
    description: 'User IDs that already read the message.',
    example: [2],
  })
  readByIds?: number[];

  @ApiPropertyOptional({ description: 'Optional parent message ID when this message is a reply.' })
  replyToMessageId?: number;
}

export class ClassificationSwaggerDto {
  @ApiProperty({ description: 'Season ID.' })
  seasonId!: number;

  @ApiProperty({ description: 'Field harvest ID.' })
  fieldHarvestId!: number;

  @ApiProperty({ description: 'User ID who updated the record.' })
  updatedById!: number;

  @ApiProperty({
    enum: AssignmentType,
    enumName: 'AssignmentType',
    description: 'Ownership target of the classification: GENERAL distributes by trader shares, TRADER belongs to one trader, CUSTOMER belongs to one customer.',
  })
  assignmentType!: AssignmentType;

  @ApiPropertyOptional({ description: 'Trader ID when assignmentType is TRADER.' })
  traderId?: number;

  @ApiPropertyOptional({ description: 'Customer ID when assignmentType is CUSTOMER.' })
  customerId?: number;

  @ApiPropertyOptional({ description: 'Trader category ID. Required for GENERAL and TRADER inventory classifications.' })
  traderCategoryId?: number;

  @ApiPropertyOptional({ description: 'Customer category ID.' })
  customerCategoryId?: number;

  @ApiPropertyOptional({ enum: Grade, enumName: 'Grade', description: 'Etrog grade.' })
  grade?: Grade;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Pitam status of the classified fruit.' })
  pitamStatus!: PitamStatus;

  @ApiPropertyOptional({ description: 'Quantity in this classification.' })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;
}

export class TraderStockSwaggerDto {
  @ApiProperty({ description: 'Season ID.' })
  seasonId!: number;

  @ApiProperty({ description: 'Movement date-time in ISO format.' })
  date!: Date | string;

  @ApiPropertyOptional({ description: 'Trader ID. Keep empty for Modulo stock.' })
  traderId?: number;

  @ApiProperty({ description: 'Trader category ID.' })
  traderCategoryId!: number;

  @ApiProperty({ enum: Grade, enumName: 'Grade', description: 'Etrog grade.' })
  grade!: Grade;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Pitam status.' })
  pitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Movement quantity.' })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Whether movement belongs to Modulo pool.' })
  isModulo?: boolean;

  @ApiPropertyOptional({ enum: MovementType, enumName: 'MovementType', description: 'Inventory movement type.' })
  type?: MovementType;

  @ApiPropertyOptional({ description: 'Reference entity ID (classification, shipment item, or allocation).' })
  MovementReferenceId?: number;

  @ApiPropertyOptional({ description: 'Shipment ID if movement is linked to shipment.' })
  shipmentId?: number;

  @ApiPropertyOptional({ description: 'Box ID if movement is linked to box.' })
  boxId?: number;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;

  @ApiProperty({ description: 'User ID who updated the movement.' })
  updatedById!: number;
}

export class CustomerAllocationSwaggerDto {
  @ApiProperty({ description: 'Season ID.' })
  seasonId!: number;

  @ApiProperty({ description: 'Allocation date-time in ISO format.' })
  date!: Date | string;

  @ApiProperty({ description: 'Hebrew date representation.' })
  dateHebrew!: string;

  @ApiProperty({ description: 'Customer ID.' })
  customerId!: number;

  @ApiProperty({ description: 'Customer category ID.' })
  customerCategoryId!: number;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Pitam status.' })
  pitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Allocated quantity.' })
  quantity!: number;

  @ApiPropertyOptional({ enum: MovementType, enumName: 'MovementType', description: 'Inventory movement type.' })
  type?: MovementType;

  @ApiPropertyOptional({ enum: SourceType, enumName: 'SourceType', description: 'Source of allocation inventory.' })
  takenFrom?: SourceType;

  @ApiPropertyOptional({ description: 'Trader ID if source is trader-specific.' })
  traderId?: number;

  @ApiPropertyOptional({ description: 'Reference entity ID (classification, shipment item, or stock movement).' })
  MovementReferenceId?: number;

  @ApiPropertyOptional({ description: 'Shipment ID if linked.' })
  shipmentId?: number;

  @ApiPropertyOptional({ description: 'Box ID if linked.' })
  boxId?: number;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;

  @ApiProperty({ description: 'User ID who updated the allocation.' })
  updatedById!: number;
}

export class ShipmentSwaggerDto {
  @ApiPropertyOptional({ description: 'Season ID. Automatically assigned from the active season when creating a shipment.' })
  seasonId!: number;

  @ApiPropertyOptional({ description: 'Total boxes in shipment.' })
  totalBoxes?: number;

  @ApiPropertyOptional({ description: 'Total quantity in shipment.' })
  totalQuantity?: number;

  @ApiPropertyOptional({ enum: ShipmentStatus, enumName: 'ShipmentStatus', description: 'Shipment lifecycle status.' })
  status?: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Date-time when shipment was sent.' })
  shippedAt?: Date | string;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;

  @ApiProperty({ description: 'User ID who updated shipment.' })
  updatedById!: number;

  @ApiPropertyOptional({ description: 'Unique slug for shipment. Auto-generated by the server.' })
  slug!: string;
}

export class BoxSwaggerDto {
  @ApiProperty({ description: 'Shipment ID.' })
  shipmentId!: number;

  @ApiPropertyOptional({ description: 'Season ID. Automatically assigned from the active season when creating a box.' })
  seasonId!: number;

  @ApiProperty({ description: 'Box sequence number within shipment.' })
  boxNumber!: number;

  @ApiProperty({ enum: BoxType, enumName: 'BoxType', description: 'Physical box type.' })
  boxType!: BoxType;

  @ApiPropertyOptional({ description: 'Total quantity in box.' })
  totalQuantity?: number;

  @ApiPropertyOptional({ enum: BoxStatus, enumName: 'BoxStatus', description: 'Operational status of the box.' })
  status?: BoxStatus;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;

  @ApiPropertyOptional({ enum: BoxOwnership, enumName: 'BoxOwnership', description: 'Ownership model for the box.' })
  ownershipType?: BoxOwnership;

  @ApiPropertyOptional({ description: 'Trader ID when ownership is trader-based.' })
  traderId?: number;

  @ApiPropertyOptional({ description: 'Customer ID when ownership is customer-based.' })
  customerId?: number;

  @ApiProperty({ description: 'User ID who updated box.' })
  updatedById!: number;
}

export class ShipmentItemSwaggerDto {
  @ApiPropertyOptional({ description: 'Shipment ID. Derived from the selected box on the server.' })
  shipmentId!: number;

  @ApiProperty({ description: 'Box ID.' })
  boxId!: number;

  @ApiPropertyOptional({ description: 'Season ID. Automatically assigned from the active season when creating an item.' })
  seasonId!: number;

  @ApiPropertyOptional({ description: 'Trader category ID.' })
  traderCategoryId?: number;

  @ApiPropertyOptional({ description: 'Customer category ID.' })
  customerCategoryId?: number;

  @ApiPropertyOptional({ enum: Grade, enumName: 'Grade', description: 'Etrog grade.' })
  grade?: Grade;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Pitam status.' })
  pitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Item quantity.' })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;

  @ApiPropertyOptional({ enum: ItemOwnership, enumName: 'ItemOwnership', description: 'Ownership model for item.' })
  ownershipType?: ItemOwnership;

  @ApiPropertyOptional({ description: 'Trader ID when ownership is trader-based.' })
  traderId?: number;

  @ApiPropertyOptional({ description: 'Customer ID when ownership is customer-based.' })
  customerId?: number;

  @ApiProperty({ description: 'User ID who updated item.' })
  updatedById!: number;
}

export class CustomerCategorySwaggerDto {
  @ApiProperty({ description: 'Season ID.' })
  seasonId!: number;

  @ApiProperty({ description: 'Customer ID.' })
  customerId!: number;

  @ApiProperty({ description: 'Category name.' })
  name!: string;

  @ApiProperty({ enum: Grade, enumName: 'Grade', description: 'Etrog grade.' })
  grade!: Grade;

  @ApiProperty({ description: 'Configured price.' })
  price!: number;

  @ApiProperty({ enum: Currency, enumName: 'Currency', description: 'Pricing currency.' })
  currency!: Currency;
}

export class PricingConfigSwaggerDto {
  @ApiProperty({ enum: Currency, enumName: 'Currency', description: 'Pricing currency.' })
  currency!: Currency;

  @ApiProperty({ description: 'Unit price value.' })
  unitPrice!: number;
}

export class SystemConfigCreateSwaggerDto {
  @ApiProperty({ description: 'Season ID for which the configuration is created or retrieved.', example: 1 })
  seasonId!: number;

  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    description: 'Initial currency value (required for new configuration).',
    example: 'ILS',
  })
  currency!: Currency;

  @ApiProperty({ description: 'Initial unit price value (required for new configuration).', example: 8.5 })
  unitPrice!: number;
}

export class SystemConfigUpdateSwaggerDto {
  @ApiPropertyOptional({
    enum: Currency,
    enumName: 'Currency',
    description: 'Updated pricing currency.',
    example: 'USD',
  })
  currency?: Currency;

  @ApiPropertyOptional({ description: 'Updated unit price value.', example: 10.25 })
  unitPrice?: number;
}

// Bulk Harvest Form DTOs
export class ClassificationBulkItemDto {
  @ApiProperty({
    enum: AssignmentType,
    enumName: 'AssignmentType',
    description: 'Ownership target of the classification: GENERAL distributes by trader shares, TRADER belongs to one trader, CUSTOMER belongs to one customer.',
  })
  assignmentType!: AssignmentType;

  @ApiPropertyOptional({ description: 'Trader ID if assignmentType is TRADER' })
  traderId?: number;

  @ApiPropertyOptional({ description: 'Customer ID if assignmentType is CUSTOMER' })
  customerId?: number;

  @ApiPropertyOptional({ description: 'Trader category ID. Required for GENERAL and TRADER inventory classifications' })
  traderCategoryId?: number;

  @ApiPropertyOptional({ description: 'Customer category ID' })
  customerCategoryId?: number;

  @ApiPropertyOptional({ enum: Grade, enumName: 'Grade' })
  grade?: Grade;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus' })
  pitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Quantity of items in this classification' })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional notes' })
  notes?: string;
}

export class UpdateClassificationDto {
  @ApiPropertyOptional({ enum: AssignmentType, enumName: 'AssignmentType', description: 'Update assignment type' })
  assignmentType?: AssignmentType;

  @ApiPropertyOptional({ description: 'Update trader ID' })
  traderId?: number;

  @ApiPropertyOptional({ description: 'Update customer ID' })
  customerId?: number;

  @ApiPropertyOptional({ description: 'Update trader category ID' })
  traderCategoryId?: number;

  @ApiPropertyOptional({ description: 'Update customer category ID' })
  customerCategoryId?: number;

  @ApiPropertyOptional({ enum: Grade, enumName: 'Grade', description: 'Update etrog grade' })
  grade?: Grade;

  @ApiPropertyOptional({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Update pitam status' })
  pitamStatus?: PitamStatus;

  @ApiPropertyOptional({ description: 'Update quantity' })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Update notes (only field that does not trigger reprocessing if changed alone)' })
  notes?: string;
}

export class ClassificationMutationMetaDto {
  @ApiProperty({
    enum: ['PARTIAL', 'FINAL'],
    description: 'Validation mode for harvest-classification consistency. PARTIAL allows gap, FINAL requires full match.',
    example: 'PARTIAL',
  })
  validationMode!: 'PARTIAL' | 'FINAL';
}

export class HarvestInlineUpdateDto {
  @ApiPropertyOptional({ description: 'Update total harvested units', example: 210 })
  totalHarvested?: number;

  @ApiPropertyOptional({ description: 'Update total rejected units', example: 5 })
  totalRejected?: number;

  @ApiPropertyOptional({ description: 'Update owner harvested units', example: 120 })
  ownerHarvested?: number;

  @ApiPropertyOptional({ description: 'Update owner rejected units', example: 3 })
  ownerRejected?: number;

  @ApiPropertyOptional({ description: 'Update harvest notes', example: 'Received another 10 after recount' })
  notes?: string;

  @ApiPropertyOptional({ description: 'User ID that performs this harvest update', example: 1 })
  updatedById?: number;
}

export class CreateHarvestClassificationDto extends ClassificationBulkItemDto {
  @ApiProperty({ description: 'User ID performing the action', example: 1 })
  updatedById!: number;

  @ApiProperty({
    enum: ['PARTIAL', 'FINAL'],
    description: 'Validation mode for harvest-classification consistency after create.',
    example: 'PARTIAL',
  })
  validationMode!: 'PARTIAL' | 'FINAL';

  @ApiPropertyOptional({
    type: HarvestInlineUpdateDto,
    description: 'Optional harvest fields update applied atomically with classification creation.',
  })
  harvestUpdate?: HarvestInlineUpdateDto;
}

export class UpdateHarvestClassificationDto extends UpdateClassificationDto {
  @ApiProperty({ description: 'User ID performing the action', example: 1 })
  updatedById!: number;

  @ApiProperty({
    enum: ['PARTIAL', 'FINAL'],
    description: 'Validation mode for harvest-classification consistency after update.',
    example: 'FINAL',
  })
  validationMode!: 'PARTIAL' | 'FINAL';

  @ApiPropertyOptional({
    type: HarvestInlineUpdateDto,
    description: 'Optional harvest fields update applied atomically with classification update.',
  })
  harvestUpdate?: HarvestInlineUpdateDto;
}

export class DeleteHarvestClassificationDto {
  @ApiProperty({
    enum: ['PARTIAL', 'FINAL'],
    description: 'Validation mode for harvest-classification consistency after delete.',
    example: 'PARTIAL',
  })
  validationMode!: 'PARTIAL' | 'FINAL';

  @ApiPropertyOptional({
    type: HarvestInlineUpdateDto,
    description: 'Optional harvest fields update applied atomically with classification delete.',
  })
  harvestUpdate?: HarvestInlineUpdateDto;
}

export class UpdateHarvestPartialClassificationDto {
  @ApiProperty({
    description: 'Whether this harvest is currently in partial classification mode.',
    example: true,
  })
  isPartialClassification!: boolean;
}

export class HarvestBulkCreateDto {
  @ApiProperty({ description: 'Gregorian date of harvest', format: 'date-time', example: '2026-10-05T06:00:00.000Z' })
  dateGregorian!: string;

  @ApiProperty({ description: 'Hebrew date representation', example: 'י"ב תשרי תשפ"ז' })
  dateHebrew!: string;

  @ApiProperty({ description: 'Field ID', example: 2 })
  fieldId!: number;

  @ApiProperty({ description: 'User ID who updated this harvest', example: 1 })
  updatedById!: number;

  @ApiPropertyOptional({ description: 'Total harvested units', example: 1500 })
  totalHarvested?: number;

  @ApiPropertyOptional({ description: 'Total rejected units', example: 50 })
  totalRejected?: number;

  @ApiPropertyOptional({ description: 'Owner harvested units', example: 1000 })
  ownerHarvested?: number;

  @ApiPropertyOptional({ description: 'Owner rejected units', example: 30 })
  ownerRejected?: number;

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Morning harvest' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Whether classification is partial (if true, classifications total can be less than net harvested)',
    example: true,
  })
  isPartialClassification?: boolean;

  @ApiProperty({
    type: [ClassificationBulkItemDto],
    description: 'At least one classification record. No duplicate combinations allowed (same assignmentType+trader/customer+category, ignoring quantity).',
    minItems: 1,
  })
  classifications!: ClassificationBulkItemDto[];
}

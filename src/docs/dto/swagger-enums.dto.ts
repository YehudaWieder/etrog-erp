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

  @ApiProperty({ description: 'Plain-text password. Must be at least 8 characters and include letters and numbers.' })
  password!: string;
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

export class MessageFilterDto {
  @ApiPropertyOptional({ description: 'Filter messages by sender user ID.' })
  senderId?: number;

  @ApiPropertyOptional({ enum: Priority, enumName: 'Priority', description: 'Filter messages by priority level.' })
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Filter messages that are replies to this message ID. Pass 0 to retrieve top-level messages only (no parent).' })
  replyToMessageId?: number;

  @ApiPropertyOptional({ description: 'Filter by read status for the authenticated user. true = read, false = unread.' })
  isRead?: boolean;
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

export class CreateShipmentSwaggerDto {
  @ApiProperty({
    description: 'User ID who creates/updates the shipment record.',
    example: 1,
  })
  updatedById!: number;

  @ApiPropertyOptional({
    enum: ShipmentStatus,
    enumName: 'ShipmentStatus',
    description: 'Optional initial shipment status. Defaults to PREPARING when omitted.',
    example: ShipmentStatus.PREPARING,
  })
  status?: ShipmentStatus;

  @ApiPropertyOptional({
    description: 'Optional ship date-time in ISO format. If provided, status is normalized to SHIPPED.',
    example: '2026-10-12T13:20:00.000Z',
  })
  shippedAt?: Date | string;

  @ApiPropertyOptional({
    description: 'Optional shipment notes.',
    example: 'Shipment for EU distribution center',
  })
  notes?: string;
}

export class UpdateShipmentSwaggerDto {
  @ApiPropertyOptional({
    description: 'User ID who updates the shipment record.',
    example: 2,
  })
  updatedById?: number;

  @ApiPropertyOptional({
    enum: ShipmentStatus,
    enumName: 'ShipmentStatus',
    description: 'Updated shipment lifecycle status.',
    example: ShipmentStatus.SHIPPED,
  })
  status?: ShipmentStatus;

  @ApiPropertyOptional({
    description: 'Updated ship date-time in ISO format. Setting this may normalize status to SHIPPED.',
    example: '2026-10-12T13:20:00.000Z',
  })
  shippedAt?: Date | string;

  @ApiPropertyOptional({
    description: 'Updated notes. Can be null to clear notes.',
    example: 'Left warehouse gate at 13:20',
  })
  notes?: string | null;
}

export class ShipmentResponseSwaggerDto {
  @ApiProperty({ description: 'Shipment database ID (auto-generated).', example: 42 })
  id!: number;

  @ApiProperty({ description: 'Sequential shipment number (auto-generated).', example: 109 })
  shipmentNumber!: number;

  @ApiProperty({ description: 'Season ID (assigned from active season on create).', example: 1 })
  seasonId!: number;

  @ApiProperty({ description: 'Total boxes in shipment (server-calculated).', example: 0 })
  totalBoxes!: number;

  @ApiProperty({ description: 'Total quantity in shipment (server-calculated).', example: 0 })
  totalQuantity!: number;

  @ApiProperty({ enum: ShipmentStatus, enumName: 'ShipmentStatus', description: 'Shipment lifecycle status.' })
  status!: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Date-time when shipment was sent.', example: '2026-10-12T13:20:00.000Z' })
  shippedAt?: Date | string | null;

  @ApiPropertyOptional({ description: 'Optional shipment notes.', example: 'Shipment for EU distribution center' })
  notes?: string | null;

  @ApiProperty({ description: 'User ID of last updater.', example: 1 })
  updatedById!: number;

  @ApiProperty({ description: 'Server-generated unique slug.', example: 'SHP-2026-109' })
  slug!: string;

  @ApiProperty({ description: 'Soft-delete flag.', example: false })
  isDeleted!: boolean;

  @ApiProperty({ description: 'Creation date-time.', example: '2026-10-10T08:30:00.000Z' })
  createdAt!: Date | string;

  @ApiProperty({ description: 'Last update date-time.', example: '2026-10-12T13:20:00.000Z' })
  updatedAt!: Date | string;
}

export class CreateBoxSwaggerDto {
  @ApiProperty({ description: 'Shipment ID to place the box in.', example: 15 })
  shipmentId!: number;

  @ApiProperty({ description: 'Box sequence number within the shipment.', example: 3 })
  boxNumber!: number;

  @ApiProperty({ enum: BoxType, enumName: 'BoxType', description: 'Physical box type.', example: 'MEDIUM' })
  boxType!: BoxType;

  @ApiProperty({ description: 'User ID who creates/updates the record.', example: 1 })
  updatedById!: number;

  @ApiPropertyOptional({ enum: BoxStatus, enumName: 'BoxStatus', description: 'Box status. Defaults to OPEN.', example: 'OPEN' })
  status?: BoxStatus;

  @ApiPropertyOptional({ description: 'Optional notes.', example: 'Dedicated box for trader 3' })
  notes?: string;

  @ApiPropertyOptional({
    enum: BoxOwnership,
    enumName: 'BoxOwnership',
    description: 'Ownership model. Defaults to UNASSIGNED. TRADER requires traderId, CUSTOMER requires customerId.',
    example: 'TRADER',
  })
  ownershipType?: BoxOwnership;

  @ApiPropertyOptional({ description: 'Required when ownershipType=TRADER.', example: 3 })
  traderId?: number;

  @ApiPropertyOptional({ description: 'Required when ownershipType=CUSTOMER.', example: null })
  customerId?: number;
}

export class UpdateBoxSwaggerDto {
  @ApiPropertyOptional({ description: 'User ID who updates the record.', example: 2 })
  updatedById?: number;

  @ApiPropertyOptional({ enum: BoxType, enumName: 'BoxType', description: 'Updated physical box type.', example: 'LARGE' })
  boxType?: BoxType;

  @ApiPropertyOptional({ enum: BoxStatus, enumName: 'BoxStatus', description: 'Updated box status.', example: 'CLOSED' })
  status?: BoxStatus;

  @ApiPropertyOptional({ description: 'Updated notes. Can be null to clear.', example: 'Sealed and ready for dispatch' })
  notes?: string | null;

  @ApiPropertyOptional({
    enum: BoxOwnership,
    enumName: 'BoxOwnership',
    description: 'Updated ownership model. TRADER requires traderId, CUSTOMER requires customerId.',
    example: 'CUSTOMER',
  })
  ownershipType?: BoxOwnership;

  @ApiPropertyOptional({ description: 'Required when ownershipType=TRADER. Pass null to clear.', example: null })
  traderId?: number | null;

  @ApiPropertyOptional({ description: 'Required when ownershipType=CUSTOMER. Pass null to clear.', example: 7 })
  customerId?: number | null;
}

export class BoxResponseSwaggerDto {
  @ApiProperty({ description: 'Box database ID (auto-generated).', example: 101 })
  id!: number;

  @ApiProperty({ description: 'Shipment ID.', example: 15 })
  shipmentId!: number;

  @ApiProperty({ description: 'Season ID (auto-assigned from active season on create).', example: 1 })
  seasonId!: number;

  @ApiProperty({ description: 'Box sequence number within the shipment.', example: 3 })
  boxNumber!: number;

  @ApiProperty({ enum: BoxType, enumName: 'BoxType', description: 'Physical box type.' })
  boxType!: BoxType;

  @ApiProperty({ description: 'Total item quantity in the box (server-calculated).', example: 0 })
  totalQuantity!: number;

  @ApiProperty({ enum: BoxStatus, enumName: 'BoxStatus', description: 'Box operational status.' })
  status!: BoxStatus;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string | null;

  @ApiProperty({ enum: BoxOwnership, enumName: 'BoxOwnership', description: 'Ownership model.' })
  ownershipType!: BoxOwnership;

  @ApiPropertyOptional({ description: 'Trader ID (set when ownershipType=TRADER).' })
  traderId?: number | null;

  @ApiPropertyOptional({ description: 'Customer ID (set when ownershipType=CUSTOMER).' })
  customerId?: number | null;

  @ApiProperty({ description: 'User ID of last updater.', example: 1 })
  updatedById!: number;

  @ApiProperty({ description: 'Soft-delete flag.', example: false })
  isDeleted!: boolean;

  @ApiProperty({ description: 'Creation date-time.', example: '2026-10-10T08:30:00.000Z' })
  createdAt!: Date | string;

  @ApiProperty({ description: 'Last update date-time.', example: '2026-10-12T13:20:00.000Z' })
  updatedAt!: Date | string;
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
    example: AssignmentType.CUSTOMER,
  })
  assignmentType!: AssignmentType;

  @ApiPropertyOptional({ description: 'Trader ID if assignmentType is TRADER' })
  traderId?: number;

  @ApiPropertyOptional({
    description: 'Customer ID if assignmentType is CUSTOMER',
    example: 1,
  })
  customerId?: number;

  @ApiPropertyOptional({ description: 'Trader category ID. Required for GENERAL and TRADER inventory classifications' })
  traderCategoryId?: number;

  @ApiPropertyOptional({
    description:
      'Customer category ID (already represents the pair of category name + grade). For CUSTOMER assignment use this field and do not send grade separately.',
    example: 2,
  })
  customerCategoryId?: number;

  @ApiPropertyOptional({
    enum: Grade,
    enumName: 'Grade',
    description: 'Used for GENERAL/TRADER inventory classifications. For CUSTOMER assignment, grade comes from customerCategoryId and should be omitted.',
  })
  grade?: Grade;

  @ApiProperty({
    enum: PitamStatus,
    enumName: 'PitamStatus',
    example: PitamStatus.WITH_PITAM,
  })
  pitamStatus!: PitamStatus;

  @ApiProperty({
    description: 'Quantity of items in this classification',
    example: 120,
  })
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Optional notes',
    example: 'מיון ללקוח CUSTOMER: חבד קלר + דרגה א - (categoryId=3)',
  })
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

  @ApiPropertyOptional({
    description:
      'Update customer category ID (name + grade pair). For CUSTOMER assignment prefer updating this field instead of grade.',
    example: 5,
  })
  customerCategoryId?: number;

  @ApiPropertyOptional({
    enum: Grade,
    enumName: 'Grade',
    description: 'Update grade for GENERAL/TRADER assignments. For CUSTOMER assignment, grade is derived from customerCategoryId.',
  })
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
    description: 'Whether this harvest classification is in partial mode (allows incomplete classification).',
    example: true,
  })
  isPartialClassification!: boolean;

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
    description: 'Whether this harvest classification is in partial mode (allows incomplete classification).',
    example: false,
  })
  isPartialClassification!: boolean;

  @ApiPropertyOptional({
    type: HarvestInlineUpdateDto,
    description: 'Optional harvest fields update applied atomically with classification update.',
  })
  harvestUpdate?: HarvestInlineUpdateDto;
}

export class DeleteHarvestClassificationDto {
  @ApiProperty({
    description: 'Whether this harvest classification is in partial mode (allows incomplete classification).',
    example: true,
  })
  isPartialClassification!: boolean;

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

// Default Trader Category DTOs
export class CreateDefaultTraderCategorySwaggerDto {
  @ApiProperty({ description: 'Default trader category name.', example: 'Yanover' })
  name!: string;

  @ApiPropertyOptional({ description: 'Optional notes for the category.', example: 'Premium quality etrog' })
  notes?: string;
}

export class UpdateDefaultTraderCategorySwaggerDto {
  @ApiPropertyOptional({ description: 'Updated category name.', example: 'Yanover Premium' })
  name?: string;

  @ApiPropertyOptional({ description: 'Updated notes.', example: 'Updated notes' })
  notes?: string;
}

export class CreateDefaultTraderCategoryShareSwaggerDto {
  @ApiProperty({ description: 'Trader ID to associate with this category share.', example: 1 })
  traderId!: number;

  @ApiProperty({
    description: 'Percentage share for this trader in the category (0-100).',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  percent!: number;
}

export class UpdateDefaultTraderCategoryShareSwaggerDto {
  @ApiProperty({
    description: 'Updated percentage share for this trader in the category (0-100).',
    example: 60,
    minimum: 0,
    maximum: 100,
  })
  percent!: number;
}

// Default Trader Category Response DTOs (for approval/display)
export class TraderShareDetailDto {
  @ApiProperty({ description: 'Trader ID.' })
  traderId!: number;

  @ApiProperty({ description: 'Trader name.' })
  traderName!: string;

  @ApiProperty({
    description: 'Percentage share for this trader in the category.',
    example: 50,
  })
  percent!: number;
}

export class DefaultTraderCategoryApprovalResponseSwaggerDto {
  @ApiProperty({ description: 'Default trader category ID.' })
  id!: number;

  @ApiProperty({ description: 'Default trader category name.' })
  name!: string;

  @ApiPropertyOptional({ description: 'Category notes.' })
  notes?: string;

  @ApiProperty({
    type: [TraderShareDetailDto],
    description: 'All trader shares for this category.',
  })
  shares!: TraderShareDetailDto[];

  @ApiProperty({
    description: 'Total percentage allocation across all traders (should be <= 100%).',
    example: 100,
  })
  totalPercent!: number;

  @ApiProperty({ description: 'Category creation timestamp.' })
  createdAt!: Date;

  @ApiProperty({ description: 'Category last update timestamp.' })
  updatedAt!: Date;
}

export class SeasonPreviewDefaultTraderShareSwaggerDto {
  @ApiProperty({ description: 'Trader ID.' })
  traderId!: number;

  @ApiProperty({ description: 'Trader name.' })
  traderName!: string;

  @ApiProperty({ description: 'Share percentage for this trader in the category.' })
  percent!: number;
}

export class SeasonPreviewDefaultTraderCategorySwaggerDto {
  @ApiProperty({ description: 'Default trader category ID.' })
  id!: number;

  @ApiProperty({ description: 'Default trader category name.' })
  name!: string;

  @ApiPropertyOptional({ description: 'Default trader category notes.' })
  notes?: string;

  @ApiProperty({ type: [SeasonPreviewDefaultTraderShareSwaggerDto], description: 'All trader shares for this category.' })
  shares!: SeasonPreviewDefaultTraderShareSwaggerDto[];

  @ApiProperty({ description: 'Total percentage allocation for the category.' })
  totalPercent!: number;
}

export class SeasonPreviewResponseSwaggerDto {
  @ApiProperty({ description: 'Whether the new season can be created.' })
  canCreate!: boolean;

  @ApiProperty({ description: 'The requested season year.' })
  yearName!: number;

  @ApiPropertyOptional({ description: 'Existing season with the same year, if any.' })
  existingSeason?: {
    id: number;
    yearName: number;
    slug: string;
    isActive: boolean;
  } | null;

  @ApiProperty({
    type: Object,
    description: 'Current default data counts and detailed category allocations.',
  })
  defaults!: {
    defaultTraderCategories: number;
    defaultTraderCategoryShares: number;
    categories: SeasonPreviewDefaultTraderCategorySwaggerDto[];
  };

  @ApiProperty({
    type: Object,
    description: 'Projected data to be created for the new season.',
  })
  projectedForNewSeason!: {
    traderCategoriesToCreate: number;
    traderSharesToCreate: number;
  };
}

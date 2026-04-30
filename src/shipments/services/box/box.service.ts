// src/shipments/services/box/box.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from 'src/generated/prisma';
import { BoxOwnership, BoxStatus, BoxType } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class BoxService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  private async syncShipmentTotals(tx: Prisma.TransactionClient, shipmentId: number) {
    const [boxCount, shipmentItems] = await Promise.all([
      tx.box.count({
        where: { shipmentId, isDeleted: false },
      }),
      tx.shipmentItem.aggregate({
        where: { shipmentId, isDeleted: false },
        _sum: { quantity: true },
      }),
    ]);

    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        totalBoxes: boxCount,
        totalQuantity: shipmentItems._sum.quantity || 0,
      },
    });
  }

  private assertPositiveInt(value: unknown, fieldName: string) {
    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }
  }

  private validateOwnership(ownershipType: unknown, traderId: unknown, customerId: unknown) {
    if (ownershipType !== undefined && !Object.values(BoxOwnership).includes(ownershipType as BoxOwnership)) {
      throw new BadRequestException('ownershipType is invalid');
    }

    if (traderId !== undefined && traderId !== null) {
      this.assertPositiveInt(traderId, 'traderId');
    }

    if (customerId !== undefined && customerId !== null) {
      this.assertPositiveInt(customerId, 'customerId');
    }

    if (ownershipType === BoxOwnership.TRADER && (traderId === undefined || traderId === null)) {
      throw new BadRequestException('traderId is required when ownershipType=TRADER');
    }

    if (ownershipType === BoxOwnership.CUSTOMER && (customerId === undefined || customerId === null)) {
      throw new BadRequestException('customerId is required when ownershipType=CUSTOMER');
    }

    if (ownershipType !== BoxOwnership.TRADER && traderId !== undefined && traderId !== null) {
      throw new BadRequestException('traderId must be empty unless ownershipType=TRADER');
    }

    if (ownershipType !== BoxOwnership.CUSTOMER && customerId !== undefined && customerId !== null) {
      throw new BadRequestException('customerId must be empty unless ownershipType=CUSTOMER');
    }
  }

  private validateCreateInput(data: Prisma.BoxUncheckedCreateInput) {
    this.assertPositiveInt(data.shipmentId, 'shipmentId');
    this.assertPositiveInt(data.boxNumber, 'boxNumber');
    this.assertPositiveInt(data.updatedById, 'updatedById');

    if (data.seasonId !== undefined || data.totalQuantity !== undefined) {
      throw new BadRequestException('seasonId and totalQuantity are managed by the server');
    }

    if (!Object.values(BoxType).includes(data.boxType as BoxType)) {
      throw new BadRequestException('boxType is invalid');
    }

    if (data.status !== undefined && !Object.values(BoxStatus).includes(data.status as BoxStatus)) {
      throw new BadRequestException('status is invalid');
    }

    if (data.notes !== undefined && typeof data.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }

    this.validateOwnership(data.ownershipType, data.traderId, data.customerId);
  }

  private validateUpdateInput(data: Prisma.BoxUncheckedUpdateInput) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one box field must be provided for update');
    }

    if (data.shipmentId !== undefined || data.seasonId !== undefined || data.boxNumber !== undefined || data.totalQuantity !== undefined || data.isDeleted !== undefined) {
      throw new BadRequestException('shipmentId, seasonId, boxNumber, totalQuantity, and isDeleted cannot be updated here');
    }

    if (data.updatedById !== undefined) {
      this.assertPositiveInt(data.updatedById, 'updatedById');
    }

    if (data.boxType !== undefined && !Object.values(BoxType).includes(data.boxType as BoxType)) {
      throw new BadRequestException('boxType is invalid');
    }

    if (data.status !== undefined && !Object.values(BoxStatus).includes(data.status as BoxStatus)) {
      throw new BadRequestException('status is invalid');
    }

    if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }

    this.validateOwnership(data.ownershipType, data.traderId, data.customerId);
  }

  // Create a new box within a shipment
  async create(data: Prisma.BoxUncheckedCreateInput) {
    this.validateCreateInput(data);

    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const shipment = await this.prisma.shipment.findFirst({
      where: { id: data.shipmentId, seasonId, isDeleted: false },
      select: { id: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${data.shipmentId} not found in active season`);
    }

    // Check if boxNumber already exists in this shipment
    const existing = await this.prisma.box.findUnique({
      where: {
        seasonId_shipmentId_boxNumber: {
          seasonId,
          shipmentId: data.shipmentId,
          boxNumber: data.boxNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Box #${data.boxNumber} already exists in shipment ${data.shipmentId}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.create({
        data: {
          ...data,
          seasonId,
          totalQuantity: 0,
        },
      });

      await this.syncShipmentTotals(tx, data.shipmentId);

      return box;
    });
  }

  // Get all boxes for a specific shipment
  async findByShipment(shipmentId: number) {
    return this.prisma.box.findMany({
      where: { shipmentId, isDeleted: false },
      include: {
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        _count: { select: { items: true } }
      },
      orderBy: { boxNumber: 'asc' },
    });
  }

  // Get single box details
  async findOne(id: number) {
    const box = await this.prisma.box.findFirst({
      where: { id, isDeleted: false },
      include: {
        items: true,
        shipment: { select: { slug: true, status: true } },
      },
    });

    if (!box) throw new NotFoundException(`Box #${id} not found`);
    return box;
  }

  // Update box details (status, type, etc.)
  async update(id: number, data: Prisma.BoxUncheckedUpdateInput) {
    this.validateUpdateInput(data);

    return this.prisma.box.update({
      where: { id },
      data,
    });
  }

  // Recalculate total quantity in the box based on ShipmentItems
  async updateBoxTotal(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.findFirst({
        where: { id, isDeleted: false },
        select: { id: true, shipmentId: true },
      });

      if (!box) {
        throw new NotFoundException(`Box #${id} not found`);
      }

      const aggregation = await tx.shipmentItem.aggregate({
        where: { boxId: id, isDeleted: false },
        _sum: { quantity: true },
      });

      const updatedBox = await tx.box.update({
        where: { id },
        data: {
          totalQuantity: aggregation._sum.quantity || 0,
        },
      });

      await this.syncShipmentTotals(tx, box.shipmentId);

      return updatedBox;
    });
  }

  // Soft delete
  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.update({
        where: { id },
        data: { isDeleted: true },
      });

      await this.syncShipmentTotals(tx, box.shipmentId);

      return box;
    });
  }
}
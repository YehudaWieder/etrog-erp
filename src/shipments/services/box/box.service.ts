// src/shipments/services/box/box.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { ShipmentsService } from '../../shipments.service';
import {
  CreateBoxInput,
  UpdateBoxInput,
  validateCreateBoxInput,
  validateUpdateBoxInput,
} from './utils/box.utils';

@Injectable()
export class BoxService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private shipmentsService: ShipmentsService,
  ) {}

  // Create a new box within a shipment
  async create(data: CreateBoxInput, actorId: number) {
    validateCreateBoxInput(data);

    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const shipment = await this.prisma.shipment.findFirst({
      where: { id: data.shipmentId, seasonId, isDeleted: false },
      select: { id: true, status: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${data.shipmentId} not found in active season`);
    }

    if (shipment.status === 'SHIPPED' || shipment.status === 'DELIVERED') {
      throw new BadRequestException('Cannot add a box to a shipment that has already been shipped or delivered');
    }

    // Check if boxNumber already exists in the active season.
    const existing = await this.prisma.box.findFirst({
      where: {
        seasonId,
        boxNumber: data.boxNumber,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Box #${data.boxNumber} already exists in the active season`);
    }

    return this.prisma.$transaction(async (tx) => {
      let box;
      try {
        box = await tx.box.create({
          data: {
            ...data,
            updatedById: actorId,
            seasonId,
            totalQuantity: 0,
          },
        });
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === 'P2002') {
          throw new ConflictException(`Box #${data.boxNumber} already exists in the active season`);
        }
        throw error;
      }

      await this.shipmentsService.syncShipmentTotals(tx, data.shipmentId);

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
        updatedBy: { select: { name: true } },
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
  async update(id: number, data: UpdateBoxInput, actorId: number) {
    validateUpdateBoxInput(data);

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.box.findFirst({
        where: { id, isDeleted: false },
        select: { id: true, shipmentId: true, seasonId: true, boxNumber: true, ownershipType: true, traderId: true, customerId: true },
      });

      if (!current) {
        throw new NotFoundException(`Box #${id} not found`);
      }

      if (data.status !== undefined) {
        const shipment = await tx.shipment.findUnique({
          where: { id: current.shipmentId },
          select: { status: true },
        });

        if (shipment?.status === 'SHIPPED' || shipment?.status === 'DELIVERED') {
          throw new BadRequestException('Cannot change box status when the shipment has already been shipped or delivered');
        }
      }

      const ownershipFieldsChanged =
        (data.ownershipType !== undefined && data.ownershipType !== current.ownershipType) ||
        (data.traderId !== undefined && data.traderId !== current.traderId) ||
        (data.customerId !== undefined && data.customerId !== current.customerId);

      if (ownershipFieldsChanged) {
        const itemCount = await tx.shipmentItem.count({ where: { boxId: id, isDeleted: false } });
        if (itemCount > 0) {
          throw new BadRequestException(
            `Cannot change box ownership type or owner while the box has ${itemCount} item(s). Remove all items first.`,
          );
        }
      }

      const targetShipmentId = data.shipmentId ?? current.shipmentId;

      if (data.shipmentId !== undefined && data.shipmentId !== current.shipmentId) {
        const newShipment = await tx.shipment.findFirst({
          where: { id: data.shipmentId, seasonId: current.seasonId, isDeleted: false },
          select: { id: true },
        });
        if (!newShipment) {
          throw new NotFoundException(`Shipment ${data.shipmentId} not found in current season`);
        }
      }

      if (data.boxNumber !== undefined && data.boxNumber !== current.boxNumber) {
        const existing = await tx.box.findFirst({
          where: { seasonId: current.seasonId, boxNumber: data.boxNumber, NOT: { id } },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException(`Box #${data.boxNumber} already exists in the active season`);
        }
      }

      const { shipmentId: _shipmentId, ...restData } = data;
      const updatedBox = await tx.box.update({
        where: { id },
        data: {
          ...restData,
          ...(data.shipmentId !== undefined ? { shipmentId: data.shipmentId } : {}),
          updatedById: actorId,
        },
      });

      await this.shipmentsService.syncShipmentTotals(tx, targetShipmentId);
      if (data.shipmentId !== undefined && data.shipmentId !== current.shipmentId) {
        await this.shipmentsService.syncShipmentTotals(tx, current.shipmentId);
      }

      return updatedBox;
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

      await this.shipmentsService.syncShipmentTotals(tx, box.shipmentId);

      return updatedBox;
    });
  }

  // Get all OPEN boxes for the active season (for item creation form)
  async findOpenForActiveSeason() {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const [boxes, systemConfig] = await Promise.all([
      this.prisma.box.findMany({
        where: { seasonId, status: 'OPEN', isDeleted: false },
        select: {
          id: true,
          boxNumber: true,
          boxType: true,
          totalQuantity: true,
          ownershipType: true,
          traderId: true,
          customerId: true,
          trader: { select: { name: true } },
          customer: { select: { customerName: true } },
          shipment: { select: { id: true, shipmentNumber: true } },
        },
        orderBy: [{ shipmentId: 'asc' }, { boxNumber: 'asc' }],
      }),
      this.prisma.systemConfig.findFirst({ where: { seasonId } }),
    ]);

    const capacityMap: Record<string, number | null> = {
      SMALL: systemConfig?.smallBoxCapacity ?? null,
      MEDIUM: systemConfig?.mediumBoxCapacity ?? null,
      LARGE: systemConfig?.largeBoxCapacity ?? null,
      CUSTOM: null,
    };

    return boxes.map((box) => ({
      ...box,
      capacity: capacityMap[box.boxType] ?? null,
    }));
  }

  // Soft delete
  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.update({
        where: { id },
        data: { isDeleted: true },
      });

      await this.shipmentsService.syncShipmentTotals(tx, box.shipmentId);

      return box;
    });
  }

  // Hard (permanent) delete – blocked if any related records exist
  async removeHard(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.findFirst({
        where: { id },
        select: { id: true, shipmentId: true },
      });

      if (!box) throw new NotFoundException(`Box #${id} not found`);

      const itemCount = await tx.shipmentItem.count({ where: { boxId: id } });
      if (itemCount > 0) {
        throw new ConflictException(
          `Cannot delete box #${id} — it has ${itemCount} associated item${itemCount === 1 ? '' : 's'}. Remove them first.`,
        );
      }

      const stockCount = await tx.traderStock.count({ where: { boxId: id } });
      if (stockCount > 0) {
        throw new ConflictException(
          `Cannot delete box #${id} — it has ${stockCount} linked trader stock record${stockCount === 1 ? '' : 's'}.`,
        );
      }

      await tx.box.delete({ where: { id } });
      await this.shipmentsService.syncShipmentTotals(tx, box.shipmentId);

      return { deleted: true, id };
    });
  }
}
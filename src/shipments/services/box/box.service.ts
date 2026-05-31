// src/shipments/services/box/box.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
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
      select: { id: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${data.shipmentId} not found in active season`);
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

    return this.prisma.box.update({
      where: { id },
      data: {
        ...data,
        updatedById: actorId,
      },
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

  // Hard (permanent) delete – removes all items in the box first, then the box itself
  async removeHard(id: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const box = await tx.box.findFirst({
          where: { id },
          select: { id: true, shipmentId: true },
        });

        if (!box) throw new NotFoundException(`Box #${id} not found`);

        await tx.shipmentItem.deleteMany({ where: { boxId: id } });
        await tx.box.delete({ where: { id } });

        await this.shipmentsService.syncShipmentTotals(tx, box.shipmentId);

        return { deleted: true, id };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete box because related records exist in the system.');
      }

      throw error;
    }
  }
}
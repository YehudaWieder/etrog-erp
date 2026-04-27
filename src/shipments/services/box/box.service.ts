// src/shipments/services/box/box.service.ts

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class BoxService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  // Create a new box within a shipment
  async create(data: Prisma.BoxUncheckedCreateInput) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

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

    return this.prisma.box.create({
      data: {
        ...data,
        seasonId,
      },
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
    return this.prisma.box.update({
      where: { id },
      data,
    });
  }

  // Recalculate total quantity in the box based on ShipmentItems
  async updateBoxTotal(id: number) {
    const aggregation = await this.prisma.shipmentItem.aggregate({
      where: { boxId: id, isDeleted: false },
      _sum: { quantity: true },
    });

    return this.prisma.box.update({
      where: { id },
      data: {
        totalQuantity: aggregation._sum.quantity || 0,
      },
    });
  }

  // Soft delete
  async remove(id: number) {
    return this.prisma.box.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
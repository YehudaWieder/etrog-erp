// src/shipments/services/shipment/shipment.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, ShipmentStatus } from '@prisma/client';

@Injectable()
export class ShipmentService {
  constructor(private prisma: PrismaService) {}

  // Create a new shipment shell
  async create(data: Prisma.ShipmentUncheckedCreateInput) {
    // Generate a slug based on year and ID (using a transaction to get the next ID or date)
    const year = new Date().getFullYear();
    
    return this.prisma.shipment.create({
      data: {
        ...data,
        slug: `SHP-${year}-${Math.floor(Math.random() * 10000)}`, // Temporary slug, can be improved with a sequence
      },
    });
  }

  // Get all shipments for a season
  async findAllBySeason(seasonId: number) {
    return this.prisma.shipment.findMany({
      where: { seasonId, isDeleted: false },
      include: {
        updatedBy: { select: { name: true } },
        _count: {
          select: { boxes: true, items: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get full shipment details including boxes and items
  async findOne(id: number) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, isDeleted: false },
      include: {
        boxes: true,
        items: {
          include: {
            trader: { select: { name: true } },
            customer: { select: { customerName: true } }
          }
        },
        updatedBy: { select: { name: true } }
      },
    });

    if (!shipment) throw new NotFoundException(`Shipment #${id} not found`);
    return shipment;
  }

  // Update shipment status or details
  async update(id: number, data: Prisma.ShipmentUncheckedUpdateInput) {
    // If status is changed to SHIPPED, set shippedAt timestamp
    if (data.status === ShipmentStatus.SHIPPED && !data.shippedAt) {
      data.shippedAt = new Date();
    }

    return this.prisma.shipment.update({
      where: { id },
      data,
    });
  }

  // Recalculate totals (call this when items/boxes are added/removed)
  async updateTotals(id: number) {
    const aggregations = await this.prisma.shipmentItem.aggregate({
      where: { shipmentId: id, isDeleted: false },
      _sum: { quantity: true },
      _count: { id: true }
    });

    const boxCount = await this.prisma.box.count({
      where: { shipmentId: id, isDeleted: false }
    });

    return this.prisma.shipment.update({
      where: { id },
      data: {
        totalQuantity: aggregations._sum.quantity || 0,
        totalBoxes: boxCount
      },
    });
  }

  // Soft delete
  async remove(id: number) {
    return this.prisma.shipment.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
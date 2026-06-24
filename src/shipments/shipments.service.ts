import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';

@Injectable()
export class ShipmentsService {
  async syncShipmentTotals(tx: Prisma.TransactionClient, shipmentId: number) {
    const [boxCount, shipmentItems] = await Promise.all([
      tx.box.count({
        where: { shipmentId, isDeleted: false },
      }),
      tx.shipmentItem.aggregate({
        where: { shipmentId, isDeleted: false },
        _sum: { quantity: true },
      }),
    ]);

    return tx.shipment.update({
      where: { id: shipmentId },
      data: {
        totalBoxes: boxCount,
        totalQuantity: shipmentItems._sum.quantity || 0,
      },
    });
  }

  async syncBoxAndShipmentTotals(tx: Prisma.TransactionClient, boxId: number, shipmentId: number) {
    const [boxSum, box] = await Promise.all([
      tx.shipmentItem.aggregate({
        where: { boxId, isDeleted: false },
        _sum: { quantity: true },
      }),
      tx.box.findUnique({
        where: { id: boxId },
        select: { boxType: true, seasonId: true, status: true },
      }),
    ]);

    const newTotal = boxSum._sum.quantity || 0;
    const updateData: Prisma.BoxUpdateInput = { totalQuantity: newTotal };

    if (box && box.boxType !== 'CUSTOM') {
      const systemConfig = await tx.systemConfig.findFirst({ where: { seasonId: box.seasonId } });
      const capacityMap: Record<string, number | null | undefined> = {
        SMALL: systemConfig?.smallBoxCapacity,
        MEDIUM: systemConfig?.mediumBoxCapacity,
        LARGE: systemConfig?.largeBoxCapacity,
      };
      const capacity = capacityMap[box.boxType];
      if (capacity != null) {
        if (box.status === 'OPEN' && newTotal >= capacity) {
          updateData.status = 'CLOSED';
        } else if (box.status === 'CLOSED' && newTotal < capacity) {
          updateData.status = 'OPEN';
        }
      }
    }

    await tx.box.update({
      where: { id: boxId },
      data: updateData,
    });

    await this.syncShipmentTotals(tx, shipmentId);
  }
}

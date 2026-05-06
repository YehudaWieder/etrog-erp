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
    const boxSum = await tx.shipmentItem.aggregate({
      where: { boxId, isDeleted: false },
      _sum: { quantity: true },
    });

    await tx.box.update({
      where: { id: boxId },
      data: { totalQuantity: boxSum._sum.quantity || 0 },
    });

    await this.syncShipmentTotals(tx, shipmentId);
  }
}

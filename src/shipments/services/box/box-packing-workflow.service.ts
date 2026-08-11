// src/shipments/services/box/box-packing-workflow.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { BoxService } from './box.service';
import { ItemService } from '../item/item.service';
import { PackBoxDto } from './dto/pack-box.dto';

@Injectable()
export class BoxPackingWorkflowService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private boxService: BoxService,
    private itemService: ItemService,
  ) {}

  // Updates a box, edits any number of already-packed items, and creates any number of new
  // shipment items in it, all atomically. The box update runs first so item capacity/ownership
  // checks see the post-update box state; edits run before creates so box.totalQuantity reflects
  // them before new-item capacity checks run. Every step shares one transaction — if any row
  // fails (an edit, a create, anything), nothing is committed and nothing is left half-applied.
  async packBox(dto: PackBoxDto, actorId: number) {
    const { id, items, itemEdits = [], ...boxData } = dto;
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction(async (tx) => {
      const box = await this.boxService.updateInTx(tx, id, boxData, actorId);

      // Belt-and-suspenders: item creation already rejects a non-OPEN box per-item inside
      // ItemService.applyItemToBox, but that only fires if the loop below actually runs. Fail
      // fast here with a clear message — covers a box whose status the same request just changed
      // away from OPEN (e.g. closed it, or moved it to an already-shipped/delivered shipment)
      // while still asking to pack items into it.
      if (items.length > 0 && box.status !== 'OPEN') {
        throw new BadRequestException('Cannot add items to a box that is not OPEN');
      }

      if (items.length > 0 && box.ownershipType === 'EXTERNAL_TRADER') {
        throw new BadRequestException('Cannot add items to an external-trader box');
      }

      const editedItems = [] as Awaited<ReturnType<ItemService['updateInTx']>>[];
      for (const edit of itemEdits) {
        // A quantity of 0 means "remove this item" — there is no such thing as a packed item with
        // zero quantity, so route it to a delete instead of failing update's positive-quantity check.
        if (edit.quantity === 0) {
          await this.itemService.removeInTx(tx, edit.id);
          continue;
        }
        const item = await this.itemService.updateInTx(tx, edit.id, { quantity: edit.quantity }, actorId);
        editedItems.push(item);
      }

      const createdItems = [] as Awaited<ReturnType<ItemService['createInTx']>>[];
      for (const itemInput of items) {
        const item = await this.itemService.createInTx(
          tx,
          { ...itemInput, boxId: id } as Prisma.ShipmentItemUncheckedCreateInput,
          actorId,
          seasonId,
        );
        createdItems.push(item);
      }

      return { box, items: createdItems, editedItems };
    }, {
      // A single pack request can create many items sequentially (box update, then N × duplicate
      // check + stock availability check + movement write + totals sync each). Prisma's default
      // transaction timeout is 5s, which the original single-item-per-request flows never
      // approached; a large batch here plausibly could. Give it a lot of headroom before failing
      // outright, especially under a slow/loaded DB.
      timeout: 300_000,
    });
  }
}

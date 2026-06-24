import { Injectable } from '@nestjs/common';
import {
  CreateHarvestClassificationDto,
  DeleteHarvestClassificationDto,
  HarvestBulkCreateDto,
  UpdateHarvestClassificationDto,
} from 'src/harvest/services/harvest-core/dto/harvest.dto';
import { HarvestBulkWorkflowService } from 'src/harvest/services/workflows/harvest-bulk-workflow.service';

@Injectable()
export class HarvestBulkService {
  constructor(private readonly workflow: HarvestBulkWorkflowService) {}

  createHarvestWithClassifications(bulkDto: HarvestBulkCreateDto, actorId: number) {
    return this.workflow.createHarvestWithClassifications(bulkDto, actorId);
  }

  createClassification(
    harvestId: number,
    createDto: CreateHarvestClassificationDto,
    actorId: number,
  ) {
    return this.workflow.createClassification(harvestId, createDto, actorId);
  }

  updateClassification(
    harvestId: number,
    classificationId: number,
    updateDto: UpdateHarvestClassificationDto,
    actorId: number,
  ) {
    return this.workflow.updateClassification(harvestId, classificationId, updateDto, actorId);
  }

  deleteClassification(
    harvestId: number,
    classificationId: number,
    deleteDto: DeleteHarvestClassificationDto,
    actorId: number,
  ) {
    return this.workflow.deleteClassification(harvestId, classificationId, deleteDto, actorId);
  }

  restoreClassification(
    deletedClassificationId: number,
    harvestId: number,
    createDto: CreateHarvestClassificationDto,
    actorId: number,
  ) {
    return this.workflow.restoreClassification(deletedClassificationId, harvestId, createDto, actorId);
  }

  permanentDeleteClassification(classificationId: number) {
    return this.workflow.permanentDeleteClassification(classificationId);
  }
}

import { Module } from '@nestjs/common';
import { HarvestController } from './controllers/harvest.controller';
import { HarvestService } from './services/harvest.service';
import { HarvestBulkService } from './services/harvest-bulk.service';
import { SeasonsModule } from 'src/seasons/seasons.module';
import { ClassificationController } from './controllers/classification.controller';
import { ClassificationService } from './classifications/classification.service';
import { HarvestQueryService } from 'src/harvest/services/queries/harvest-query.service';
import { HarvestCommandService } from 'src/harvest/services/commands/harvest-command.service';
import { HarvestRepository } from 'src/harvest/services/harvest-core/repositories/harvest.repository';
import { ClassificationRepository } from 'src/harvest/services/harvest-core/repositories/classification.repository';
import { AllocationRepository } from 'src/harvest/services/harvest-core/repositories/allocation.repository';
import { HarvestBulkWorkflowService } from 'src/harvest/services/workflows/harvest-bulk-workflow.service';
import { HarvestAllocationService } from 'src/harvest/services/workflows/harvest-allocation.service';

@Module({
  imports: [SeasonsModule],
  controllers: [HarvestController, ClassificationController],
  providers: [
    HarvestService,
    HarvestBulkService,
    HarvestBulkWorkflowService,
    HarvestAllocationService,
    HarvestQueryService,
    HarvestCommandService,
    HarvestRepository,
    ClassificationRepository,
    AllocationRepository,
    ClassificationService,
  ],
  exports: [HarvestBulkService],
})
export class HarvestModule {}

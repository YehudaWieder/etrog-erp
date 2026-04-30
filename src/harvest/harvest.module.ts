import { Module } from '@nestjs/common';
import { HarvestController } from './harvest.controller';
import { HarvestService } from './harvest.service';
import { HarvestBulkService } from './harvest-bulk.service';
import { SeasonsModule } from 'src/seasons/seasons.module';
import { ClassificationController } from './classifications/classification.controller';
import { ClassificationService } from './classifications/classification.service';

@Module({
  imports: [SeasonsModule],
  controllers: [HarvestController, ClassificationController],
  providers: [HarvestService, HarvestBulkService, ClassificationService],
  exports: [HarvestBulkService],
})
export class HarvestModule {}

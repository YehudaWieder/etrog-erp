import { Module } from '@nestjs/common';
import { HarvestController } from './harvest.controller';
import { HarvestService } from './harvest.service';
import { HarvestBulkService } from './harvest-bulk.service';
import { SeasonsModule } from 'src/seasons/seasons.module';

@Module({
  imports: [SeasonsModule],
  controllers: [HarvestController],
  providers: [HarvestService, HarvestBulkService],
})
export class HarvestModule {}

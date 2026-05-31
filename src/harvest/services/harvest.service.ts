import { Injectable } from '@nestjs/common';
import {
  FieldHarvestCreateDto,
  FieldHarvestUpdateDto,
} from 'src/harvest/services/harvest-core/dto/harvest.dto';
import { HarvestCommandService } from 'src/harvest/services/commands/harvest-command.service';
import { HarvestQueryService } from 'src/harvest/services/queries/harvest-query.service';

@Injectable()
export class HarvestService {
  constructor(
    private readonly harvestCommandService: HarvestCommandService,
    private readonly harvestQueryService: HarvestQueryService,
  ) {}

  create(data: FieldHarvestCreateDto, actorId: number) {
    return this.harvestCommandService.create(data, actorId);
  }

  findAllBySeason(seasonId: number) {
    return this.harvestQueryService.findAllBySeason(seasonId);
  }

  findFieldTotalsBySeason(seasonId: number) {
    return this.harvestQueryService.findFieldTotalsBySeason(seasonId);
  }

  findFieldReportDetailsBySeasonAndField(seasonId: number, fieldId: number) {
    return this.harvestQueryService.findFieldReportDetailsBySeasonAndField(seasonId, fieldId);
  }

  findOne(id: number) {
    return this.harvestQueryService.findOne(id);
  }

  findByFieldNameAndDate(fieldName: string, date: string) {
    return this.harvestQueryService.findByFieldNameAndDate(fieldName, date);
  }

  update(id: number, data: Omit<FieldHarvestUpdateDto, 'id'>, actorId: number) {
    return this.harvestCommandService.update(id, data, actorId);
  }

  updatePartialClassificationMode(id: number, isPartialClassification: boolean) {
    return this.harvestCommandService.updatePartialClassificationMode(id, isPartialClassification);
  }

  remove(id: number) {
    return this.harvestCommandService.remove(id);
  }
}

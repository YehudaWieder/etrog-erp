import { Module } from '@nestjs/common';
import { TradersCatController } from './controllers/traders-cat/traders-cat.controller';
import { TradersCatService } from './services/traders-cat/traders-cat.service';
import { CustomerCatService } from './services/customrs-cat/customrs-cat.service';
import { CustomerCatController } from './controllers/customrs-cat/customrs-cat.controller';
import { TraderCatShareController } from './controllers/traders-cat-share/traders-cat-share.controller';
import { TraderCatShareService } from './services/traders-cat-share/traders-cat-share.service';
import { SeasonsModule } from 'src/seasons/seasons.module';

@Module({
  imports: [SeasonsModule],
  controllers: [TradersCatController, CustomerCatController, TraderCatShareController],
  providers: [TradersCatService, CustomerCatService, TraderCatShareService]
})
export class CategoriesModule {}

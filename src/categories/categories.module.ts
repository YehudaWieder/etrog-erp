import { Module } from '@nestjs/common';
import { TradersCatController } from './traders-cat/traders-cat.controller';
import { TradersCatService } from './services/traders-cat/traders-cat.service';
import { CustomrsCatService } from './services/customrs-cat/customrs-cat.service';
import { CustomrsCatController } from './services/customrs-cat/customrs-cat.controller';
import { CustomrsCatController } from './controllers/customrs-cat/customrs-cat.controller';
import { TradersCatShareController } from './controllers/traders-cat-share/traders-cat-share.controller';
import { TradersCatShareService } from './services/traders-cat-share/traders-cat-share.service';

@Module({
  controllers: [TradersCatController, CustomrsCatController, TradersCatShareController],
  providers: [TradersCatService, CustomrsCatService, TradersCatShareService]
})
export class CategoriesModule {}

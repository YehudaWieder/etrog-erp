import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Partners')
@Controller('partners')
export class PartnersController {}

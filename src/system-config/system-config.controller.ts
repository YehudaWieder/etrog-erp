import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('System Configuration')
@Controller('system-config')
export class ConfigController {}
import { Module } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';
import { ActiveGuard } from './guards/active.guard';

@Module({
  providers: [RolesGuard, ActiveGuard],
  exports: [RolesGuard, ActiveGuard],
})
export class AuthorizationModule {}

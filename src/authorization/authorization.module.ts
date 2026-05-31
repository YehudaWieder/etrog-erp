import { Module } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';
import { ActiveGuard } from './guards/active.guard';
import { WorkerAccessGuard } from './guards/worker-access.guard';

@Module({
  providers: [RolesGuard, ActiveGuard, WorkerAccessGuard],
  exports: [RolesGuard, ActiveGuard, WorkerAccessGuard],
})
export class AuthorizationModule {}

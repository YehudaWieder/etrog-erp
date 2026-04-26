import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthController } from './controllers/auth/auth.controller';

@Module({
  controllers: [UsersController, AuthController],
  providers: [UsersService]
})
export class UsersModule {}

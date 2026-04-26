import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users/users.controller';
import { UsersService } from './services/users/users.service';
import { AuthController } from './controllers/auth/auth.controller';

@Module({
  controllers: [UsersController, AuthController],
  providers: [UsersService]
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { GuardiansService } from './guardians.service';
import { GuardiansController } from './guardians.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CompetitorsModule } from '../competitors/competitors.module';

@Module({
  imports: [AuthModule, UsersModule, CompetitorsModule],
  controllers: [GuardiansController],
  providers: [GuardiansService],
})
export class GuardiansModule {}

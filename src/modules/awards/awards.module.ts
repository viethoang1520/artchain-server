import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwardsService } from './awards.service';
import { AwardsController } from './awards.controller';
import { Award } from './entities/award.entity';
import { AuthModule } from '../auth/auth.module';
import { ContestsModule } from '../contests/contests.module';
import { UsersModule } from '../users/users.module';
import { PaintingsModule } from '../paintings/paintings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Award]),
    AuthModule,
    forwardRef(() => ContestsModule),
    UsersModule,
    forwardRef(() => PaintingsModule),
  ],
  controllers: [AwardsController],
  providers: [AwardsService],
  exports: [AwardsService],
})
export class AwardsModule {}

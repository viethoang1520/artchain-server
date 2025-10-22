import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import { Contest } from '../contests/entities/contests.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Competitor, Examiner, Painting, Contest]),
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

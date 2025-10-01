import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class CompetitorProfileDto {
  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ required: false })
  birthday?: Date;

  @ApiProperty({ required: false })
  schoolName?: string;

  @ApiProperty({ required: false })
  ward?: string;

  @ApiProperty({ required: false })
  grade?: string;
}

export class ExaminerProfileDto {
  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ required: false })
  specialization?: string;
}


export class GuardianProfileDto {
  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;
}
//-----------------------------------
export class AchievementDto {
  @ApiProperty()
  contestTitle: string;

  @ApiProperty({ required: false })
  ranking?: number;

  @ApiProperty({ required: false })
  score?: number;

  @ApiProperty({ required: false })
  award?: string;
}

export class ContestDto {
  @ApiProperty()
  contestId: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  status: string;
}

import { UserRole } from '../entities/user.entity';

export class ProfileResponseDto {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;

  achievement?: any[];
  contests?: any[];
  assignedContests?: any[];
}

export class CompetitorProfileDto {
  fullName: string;
  email: string;
  phone: string;
  birthday?: Date;
  schoolName?: string;
  ward?: string;
  grade?: string;
}

export class ExaminerProfileDto {
  fullName: string;
  email: string;
  phone: string;
  specialization?: string;
}


export class GuardianProfileDto {
  fullName: string;
  email: string;
  phone: string;
}
//-----------------------------------
export class AchievementDto {
  contestTitle: string;
  ranking?: number;
  score?: number;
  award?: string;
}

export class ContestDto {
  contestId: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

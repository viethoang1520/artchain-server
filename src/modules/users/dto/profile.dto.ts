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
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  birthday?: Date;
  schoolName?: string;
  ward?: string;
  grade?: string;
  role: UserRole;
}

export class ExaminerProfileDto {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  specialization?: string;
  role: UserRole;
}


export class GuardianProfileDto {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
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

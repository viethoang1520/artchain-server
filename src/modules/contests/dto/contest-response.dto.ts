import { Contest } from '../entities/contests.entity';

export class ContestResponseDto {
  contestId: number;
  title: string;
  description: string;
  numOfAward: number;
  startDate: Date;
  endDate: Date;
  status: string;
  createdBy: number;

  constructor(contest: Contest) {
    this.contestId = contest.contestId;
    this.title = contest.title;
    this.description = contest.description;
    this.numOfAward = contest.numOfAward;
    this.startDate = contest.startDate;
    this.endDate = contest.endDate;
    this.status = contest.status;
    this.createdBy = contest.createdBy;
  }
}

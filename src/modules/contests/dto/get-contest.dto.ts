import { ApiProperty } from "@nestjs/swagger";
import { Contest, ContestStatus } from "../entities/contests.entity";

export class GetContestDto {
  @ApiProperty({ required: false, enum: ContestStatus, example: ContestStatus.ACTIVE })
  status?: ContestStatus;
}
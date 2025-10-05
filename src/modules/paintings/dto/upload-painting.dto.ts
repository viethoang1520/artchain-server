import { IsNotEmpty, IsOptional, IsString } from "class-validator";


export class UploadPaintingDto {
  @IsNotEmpty()
  @IsString()
  competitorId: string;
  
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  contestId: number;

  @IsString()
  description: string;

  @IsString()
  roundId: string;
}

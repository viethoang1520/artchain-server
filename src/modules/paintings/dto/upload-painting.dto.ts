import { ApiProperty, ApiResponse } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";


export class UploadPaintingDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty()
  competitorId: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  title: string;

  @IsNotEmpty()
  @ApiProperty()
  contestId: number;

  @IsString()
  @ApiProperty()
  description: string;

  @IsString()
  @ApiProperty()
  roundId: string;
}

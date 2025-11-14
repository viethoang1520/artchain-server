import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetSubmissionsDto {
  @ApiProperty({
    description: 'ID của user cần xem submissions',
    example: 'ba9b73f4-bdfd-4374-b289-5c1fcff701fe',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;
}

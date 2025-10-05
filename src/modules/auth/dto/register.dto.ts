import { ApiProperty } from '@nestjs/swagger';

export class RegisterDTO {
  @ApiProperty()
  username: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  birthday: Date;

  @ApiProperty()
  schoolName: string;

  @ApiProperty()
  ward: string;

  @ApiProperty()
  grade: string;
}

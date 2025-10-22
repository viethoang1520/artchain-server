import { ApiProperty } from "@nestjs/swagger";

export class UpdateUserDto {
  @ApiProperty({
    description: 'Họ và tên của người dùng',
    example: 'Nguyễn Văn A',
  })
  fullName?: string;

  @ApiProperty({
    description: 'Địa chỉ email của người dùng',
    example: 'nguyenvana@example.com',
  })
  email?: string;

  @ApiProperty({
    description: 'Số điện thoại của người dùng',
    example: '0123456789',
  })
  phone?: string;
}

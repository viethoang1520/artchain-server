import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator/types/decorator/common/IsNotEmpty";
import { IsUUID } from "class-validator/types/decorator/string/IsUUID";
import { UUID } from "crypto";

export class CreateWalletDto{
  @ApiProperty({
    description: 'ID của user sở hữu ví',
    example: 'ba9b73f4-bdfd-4374-b289-5c1fcff701fe',
  })
  @IsNotEmpty()
  @IsUUID()   
  accountId: UUID
}
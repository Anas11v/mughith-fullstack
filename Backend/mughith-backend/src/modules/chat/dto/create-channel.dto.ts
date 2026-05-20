import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateChannelDto {
  @ApiProperty()
  @IsUUID()
  caseId: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { CaseStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ enum: CaseStatus })
  @IsEnum(CaseStatus)
  status: CaseStatus;
}

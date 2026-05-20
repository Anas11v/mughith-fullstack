import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CloseCaseDto {
  @ApiProperty({ example: 'Patient stabilized, ambulance took over.' })
  @IsString()
  @MinLength(5)
  outcome: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class AmbulanceInfoDto {
  @ApiPropertyOptional({ example: 'ABC-1234' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  plate?: string;

  @ApiPropertyOptional({ example: '12 min' })
  @IsOptional()
  @IsString()
  eta?: string;

  @ApiPropertyOptional({ example: 'Team Alpha' })
  @IsOptional()
  @IsString()
  crew?: string;
}

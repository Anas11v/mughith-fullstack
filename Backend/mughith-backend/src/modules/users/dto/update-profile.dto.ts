import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ahmed Ali' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+966500000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'BLS' })
  @IsOptional()
  @IsString()
  certification?: string;

  @ApiPropertyOptional({ example: '2027-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  certExpiry?: string;

  @ApiPropertyOptional({ example: 'fcm-device-token' })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiPropertyOptional({
    example: 24.7136,
    description: 'REST fallback for initial donator location',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    example: 46.6753,
    description: 'REST fallback for initial donator location',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

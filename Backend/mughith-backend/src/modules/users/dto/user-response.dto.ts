import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiPropertyOptional()
  certification: string | null;

  @ApiPropertyOptional()
  certExpiry: Date | null;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  isBusy: boolean;

  @ApiPropertyOptional()
  latitude: number | null;

  @ApiPropertyOptional()
  longitude: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

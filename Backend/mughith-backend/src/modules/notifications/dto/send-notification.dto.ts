import { NotificationType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendNotificationDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  message: string;
}

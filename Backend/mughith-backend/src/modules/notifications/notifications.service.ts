import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { FirebaseService } from '../../common/services/firebase.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  async sendPush(dto: SendNotificationDto): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        caseId: dto.caseId,
        type: dto.type,
        message: dto.message,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { fcmToken: true },
    });

    if (user?.fcmToken) {
      await this.firebase.sendToDevice(user.fcmToken, {
        title: this.titleForType(dto.type),
        body: dto.message,
        data: {
          notificationId: notification.id,
          type: dto.type,
          ...(dto.caseId ? { caseId: dto.caseId } : {}),
        },
      });
    }
  }

  async cancelForCase(caseId: string, excludeUserId: string): Promise<void> {
    const alerts = await this.prisma.notification.findMany({
      where: {
        caseId,
        userId: { not: excludeUserId },
        type: NotificationType.CASE_ALERT,
      },
    });

    for (const alert of alerts) {
      await this.prisma.notification.create({
        data: {
          userId: alert.userId,
          caseId,
          type: NotificationType.CASE_CANCELLED,
          message: 'Case already assigned to another volunteer',
        },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: alert.userId },
        select: { fcmToken: true },
      });

      if (user?.fcmToken) {
        await this.firebase.sendToDevice(user.fcmToken, {
          title: 'Mission cancelled',
          body: 'Case already assigned',
          data: { type: NotificationType.CASE_CANCELLED, caseId },
        });
      }
    }
  }

  async getUserNotifications(userId: string, unreadOnly?: boolean) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  private titleForType(type: NotificationType): string {
    switch (type) {
      case NotificationType.CASE_ALERT:
        return 'Emergency case nearby';
      case NotificationType.CASE_ASSIGNED:
        return 'Case assigned';
      case NotificationType.CASE_CANCELLED:
        return 'Mission cancelled';
      case NotificationType.CASE_CLOSED:
        return 'Case closed';
      default:
        return 'Mugeeth';
    }
  }
}

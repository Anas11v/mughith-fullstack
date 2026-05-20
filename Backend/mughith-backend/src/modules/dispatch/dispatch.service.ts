import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Case, CaseStatus, NotificationType, Role } from '@prisma/client';
import { StreamChatService } from '../../common/services/stream-chat.service';
import {
  haversineDistanceKm,
  estimateEtaMinutes,
} from '../../common/utils/haversine';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const DEFAULT_TOP_N = 5;

export interface NearbyDonator {
  id: string;
  name: string;
  phone: string | null;
  distanceKm: number;
  etaMinutes: number;
  latitude: number;
  longitude: number;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly streamChat: StreamChatService,
  ) {}

  async findAndNotify(emergencyCase: Case): Promise<NearbyDonator[]> {
    const candidates = await this.findEligibleDonators(emergencyCase);
    const topN = candidates.slice(0, DEFAULT_TOP_N);

    for (const donator of topN) {
      await this.notifications.sendPush({
        userId: donator.id,
        caseId: emergencyCase.id,
        type: NotificationType.CASE_ALERT,
        message: `Emergency ${emergencyCase.severity} — ${donator.distanceKm.toFixed(1)} km away`,
      });
    }

    this.logger.log(
      `Dispatched case ${emergencyCase.id} to ${topN.length} donators`,
    );
    return topN;
  }

  async acceptCase(caseId: string, donatorId: string): Promise<Case> {
    const donator = await this.prisma.user.findUnique({
      where: { id: donatorId },
    });
    if (!donator || donator.role !== Role.DONATOR) {
      throw new NotFoundException('Donator not found');
    }

    if (donator.isBusy) {
      throw new ConflictException('Donator already assigned to an active case');
    }

    const targetCase = await this.prisma.case.findUnique({
      where: { id: caseId },
    });
    if (!targetCase) {
      throw new NotFoundException('Case not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.case.updateMany({
        where: { id: caseId, status: CaseStatus.OPEN },
        data: { status: CaseStatus.ASSIGNED, assignedToId: donatorId },
      });

      if (updated.count === 0) {
        throw new ConflictException('Case already assigned');
      }

      await tx.user.update({
        where: { id: donatorId },
        data: { isBusy: true },
      });

      return tx.case.findUnique({
        where: { id: caseId },
        include: {
          assignedTo: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              role: true,
              certification: true,
              certExpiry: true,
              isVerified: true,
              isAvailable: true,
              isBusy: true,
              latitude: true,
              longitude: true,
              fcmToken: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              role: true,
              certification: true,
              certExpiry: true,
              isVerified: true,
              isAvailable: true,
              isBusy: true,
              latitude: true,
              longitude: true,
              fcmToken: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    if (!result) {
      throw new NotFoundException('Case disappeared after update');
    }

    await this.notifications.cancelForCase(caseId, donatorId);

    await this.notifications.sendPush({
      userId: result.createdById,
      caseId,
      type: NotificationType.CASE_ASSIGNED,
      message: `Case assigned to ${result.assignedTo?.name ?? 'donator'}`,
    });

    await this.streamChat.createChannelForCase(
      caseId,
      result.createdById,
      donatorId,
    );

    return result;
  }

  async rejectCase(caseId: string, donatorId: string): Promise<{ ok: true }> {
    await this.prisma.notification.updateMany({
      where: {
        caseId,
        userId: donatorId,
        type: NotificationType.CASE_ALERT,
        read: false,
      },
      data: { read: true },
    });
    return { ok: true };
  }

  async getNearbyDonators(caseId: string): Promise<NearbyDonator[]> {
    const target = await this.prisma.case.findUnique({
      where: { id: caseId },
    });
    if (!target) throw new NotFoundException('Case not found');
    return this.findEligibleDonators(target);
  }

  private async findEligibleDonators(
    emergencyCase: Case,
  ): Promise<NearbyDonator[]> {
    const candidates = await this.prisma.user.findMany({
      where: {
        role: Role.DONATOR,
        isAvailable: true,
        isVerified: true,
        isBusy: false,
        latitude: { not: null },
        longitude: { not: null },
      },
    });

    const scored = candidates
      .map((user) => {
        const distanceKm = haversineDistanceKm(
          { latitude: emergencyCase.latitude, longitude: emergencyCase.longitude },
          { latitude: user.latitude!, longitude: user.longitude! },
        );
        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          distanceKm,
          etaMinutes: estimateEtaMinutes(distanceKm),
          latitude: user.latitude!,
          longitude: user.longitude!,
        } satisfies NearbyDonator;
      })
      .filter((c) => c.distanceKm <= emergencyCase.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return scored;
  }
}

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Case, CaseStatus, NotificationType, Role } from '@prisma/client';
import { GeocodingService } from '../../common/services/geocoding.service';
import {
  PaginatedResponse,
  buildPaginated,
} from '../../common/dto/paginated-response.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { AmbulanceInfoDto } from './dto/ambulance-info.dto';
import { CloseCaseDto } from './dto/close-case.dto';
import { CreateCaseDto } from './dto/create-case.dto';
import { ListCasesQueryDto } from './dto/list-cases-query.dto';

const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  OPEN: [CaseStatus.ASSIGNED, CaseStatus.EXPIRED, CaseStatus.CLOSED],
  ASSIGNED: [CaseStatus.ON_SCENE, CaseStatus.CLOSED],
  ON_SCENE: [CaseStatus.CLOSED],
  CLOSED: [],
  EXPIRED: [],
};

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);
  private readonly expiryMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoding: GeocodingService,
    private readonly notifications: NotificationsService,
    private readonly dispatch: DispatchService,
    private readonly config: ConfigService,
  ) {
    this.expiryMinutes = Number(
      this.config.get('CASE_EXPIRY_MINUTES') ?? 5,
    );
  }

  async create(creatorId: string, dto: CreateCaseDto): Promise<Case> {
    let latitude = dto.latitude;
    let longitude = dto.longitude;

    if (latitude === undefined || longitude === undefined) {
      const coords = await this.geocoding.geocode(dto.address);
      if (!coords) {
        throw new BadRequestException(
          'Could not geocode address; provide latitude and longitude',
        );
      }
      latitude = coords.latitude;
      longitude = coords.longitude;
    }

    const expiresAt = new Date(Date.now() + this.expiryMinutes * 60 * 1000);

    const createdCase = await this.prisma.case.create({
      data: {
        address: dto.address,
        latitude,
        longitude,
        severity: dto.severity,
        notes: dto.notes,
        radiusKm: dto.radiusKm ?? 5,
        status: CaseStatus.OPEN,
        expiresAt,
        createdById: creatorId,
      },
    });

    await this.dispatch.findAndNotify(createdCase);
    return createdCase;
  }

  async findAll(
    query: ListCasesQueryDto,
  ): Promise<PaginatedResponse<Case>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
    };

    const [cases, total] = await this.prisma.$transaction([
      this.prisma.case.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.case.count({ where }),
    ]);

    return buildPaginated(cases, total, page, limit);
  }

  async findOne(caseId: string): Promise<Case> {
    const found = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!found) {
      throw new NotFoundException('Case not found');
    }
    return found;
  }

  async updateStatus(caseId: string, newStatus: CaseStatus): Promise<Case> {
    const current = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!current) throw new NotFoundException('Case not found');

    const allowed = ALLOWED_TRANSITIONS[current.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Illegal status transition ${current.status} → ${newStatus}`,
      );
    }

    const extra =
      newStatus === CaseStatus.CLOSED ? { closedAt: new Date() } : {};

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.case.update({
        where: { id: caseId },
        data: { status: newStatus, ...extra },
      });
      // When a case becomes terminal, free up the assigned donator so they can take new alerts.
      if (
        (newStatus === CaseStatus.CLOSED || newStatus === CaseStatus.EXPIRED) &&
        updated.assignedToId
      ) {
        await tx.user.update({
          where: { id: updated.assignedToId },
          data: { isBusy: false },
        });
      }
      return updated;
    });
  }

  async close(caseId: string, dto: CloseCaseDto): Promise<Case> {
    const current = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!current) throw new NotFoundException('Case not found');

    if (current.status === CaseStatus.CLOSED) {
      throw new BadRequestException('Case already closed');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.case.update({
        where: { id: caseId },
        data: {
          status: CaseStatus.CLOSED,
          closedAt: new Date(),
          outcome: dto.outcome,
        },
      });

      if (updated.assignedToId) {
        await tx.user.update({
          where: { id: updated.assignedToId },
          data: { isBusy: false },
        });
        await this.notifications.sendPush({
          userId: updated.assignedToId,
          caseId,
          type: NotificationType.CASE_CLOSED,
          message: `Case closed: ${dto.outcome}`,
        });
      }

      return updated;
    });
  }

  async updateAmbulanceInfo(
    caseId: string,
    dto: AmbulanceInfoDto,
  ): Promise<Case> {
    const current = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!current) throw new NotFoundException('Case not found');

    if (current.status !== CaseStatus.ASSIGNED && current.status !== CaseStatus.ON_SCENE) {
      throw new BadRequestException(
        'Ambulance info only available for ASSIGNED or ON_SCENE cases',
      );
    }

    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        ambulancePlate: dto.plate ?? current.ambulancePlate,
        ambulanceEta: dto.eta ?? current.ambulanceEta,
        ambulanceCrew: dto.crew ?? current.ambulanceCrew,
      },
    });

    if (updated.assignedToId) {
      await this.notifications.sendPush({
        userId: updated.assignedToId,
        caseId,
        type: NotificationType.GENERAL,
        message: `Ambulance info updated (plate: ${updated.ambulancePlate ?? 'N/A'}, ETA: ${updated.ambulanceEta ?? 'N/A'})`,
      });
    }

    return updated;
  }

  async triggerPanic(caseId: string, userId: string): Promise<Case> {
    const current = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { createdBy: { select: { role: true } } },
    });
    if (!current) throw new NotFoundException('Case not found');

    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: { panicTriggered: true },
    });

    await this.notifications.sendPush({
      userId: current.createdById,
      caseId,
      type: NotificationType.GENERAL,
      message: 'Ambulance crew triggered the panic button',
    });

    this.logger.warn(`Panic triggered by ${userId} on case ${caseId}`);
    return updated;
  }

  async getHistory(
    userId: string,
    role: Role,
  ): Promise<Case[]> {
    const where =
      role === Role.DONATOR
        ? { assignedToId: userId }
        : { createdById: userId };

    return this.prisma.case.findMany({
      where: {
        ...where,
        status: { in: [CaseStatus.CLOSED, CaseStatus.EXPIRED] },
      },
      orderBy: { closedAt: 'desc' },
      take: 50,
    });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async expireOldOpenCases(): Promise<void> {
    const result = await this.prisma.case.updateMany({
      where: {
        status: CaseStatus.OPEN,
        expiresAt: { lt: new Date() },
      },
      data: { status: CaseStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} OPEN cases`);
    }
  }
}

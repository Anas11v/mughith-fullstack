import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CaseStatus, NotificationType, Role } from '@prisma/client';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';
import { createCase, createUser } from './helpers/factories';

describe('Dispatch (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    prisma = setup.prisma;
    jwtService = app.get(JwtService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('POST /dispatch/:caseId/accept', () => {
    it('first donator to accept wins; second gets 409', async () => {
      const { user: disp } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const { user: d1, token: t1 } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
        isVerified: true,
        isAvailable: true,
      });
      const { user: d2, token: t2 } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
        isVerified: true,
        isAvailable: true,
      });
      const c = await createCase(prisma, disp.id, { status: CaseStatus.OPEN });

      await request(app.getHttpServer())
        .post(`/dispatch/${c.id}/accept`)
        .set('Authorization', `Bearer ${t1}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/dispatch/${c.id}/accept`)
        .set('Authorization', `Bearer ${t2}`)
        .expect(409);

      const updated = await prisma.case.findUnique({ where: { id: c.id } });
      expect(updated?.status).toBe(CaseStatus.ASSIGNED);
      expect(updated?.assignedToId).toBe(d1.id);

      const firstDonator = await prisma.user.findUnique({
        where: { id: d1.id },
      });
      expect(firstDonator?.isBusy).toBe(true);

      const secondDonator = await prisma.user.findUnique({
        where: { id: d2.id },
      });
      expect(secondDonator?.isBusy).toBe(false);
    });

    it('rejects busy donator', async () => {
      const { user: disp } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
        isBusy: true,
      });
      const c = await createCase(prisma, disp.id, { status: CaseStatus.OPEN });

      await request(app.getHttpServer())
        .post(`/dispatch/${c.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
    });

    it('returns 403 for non-DONATOR', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const c = await createCase(prisma, disp.id, { status: CaseStatus.OPEN });

      await request(app.getHttpServer())
        .post(`/dispatch/${c.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('cancels alerts for other donators after accept', async () => {
      const { user: disp } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const { user: d1, token: t1 } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
        isAvailable: true,
        isVerified: true,
      });
      const { user: d2 } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
        isAvailable: true,
        isVerified: true,
      });
      const c = await createCase(prisma, disp.id, { status: CaseStatus.OPEN });

      await prisma.notification.create({
        data: {
          userId: d2.id,
          caseId: c.id,
          type: NotificationType.CASE_ALERT,
          message: 'Emergency nearby',
        },
      });

      await request(app.getHttpServer())
        .post(`/dispatch/${c.id}/accept`)
        .set('Authorization', `Bearer ${t1}`)
        .expect(201);

      const cancelled = await prisma.notification.findFirst({
        where: {
          userId: d2.id,
          caseId: c.id,
          type: NotificationType.CASE_CANCELLED,
        },
      });
      expect(cancelled).not.toBeNull();
    });
  });

  describe('POST /dispatch/:caseId/reject', () => {
    it('marks existing alerts as read', async () => {
      const { user: disp } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const { user: donator, token } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
      });
      const c = await createCase(prisma, disp.id, { status: CaseStatus.OPEN });
      const notif = await prisma.notification.create({
        data: {
          userId: donator.id,
          caseId: c.id,
          type: NotificationType.CASE_ALERT,
          message: 'Nearby',
        },
      });

      await request(app.getHttpServer())
        .post(`/dispatch/${c.id}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const after = await prisma.notification.findUnique({
        where: { id: notif.id },
      });
      expect(after?.read).toBe(true);
    });
  });

  describe('GET /dispatch/:caseId/nearby', () => {
    it('returns eligible donators sorted by distance', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await createUser(prisma, jwtService, {
        role: Role.DONATOR,
        isAvailable: true,
        isVerified: true,
        latitude: 21.4225,
        longitude: 39.8262,
      });
      await createUser(prisma, jwtService, {
        role: Role.DONATOR,
        isAvailable: true,
        isVerified: true,
        latitude: 21.4,
        longitude: 39.8,
      });
      const c = await createCase(prisma, disp.id, {
        latitude: 21.4225,
        longitude: 39.8262,
        radiusKm: 10,
      });

      const res = await request(app.getHttpServer())
        .get(`/dispatch/${c.id}/nearby`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(2);
      expect(res.body[0].distanceKm).toBeLessThanOrEqual(res.body[1].distanceKm);
    });

    it('excludes busy and unavailable donators', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await createUser(prisma, jwtService, {
        role: Role.DONATOR,
        isAvailable: true,
        isVerified: true,
        isBusy: true,
        latitude: 21.4225,
        longitude: 39.8262,
      });
      await createUser(prisma, jwtService, {
        role: Role.DONATOR,
        isAvailable: false,
        isVerified: true,
        latitude: 21.42,
        longitude: 39.82,
      });
      const c = await createCase(prisma, disp.id, {
        latitude: 21.4225,
        longitude: 39.8262,
        radiusKm: 10,
      });

      const res = await request(app.getHttpServer())
        .get(`/dispatch/${c.id}/nearby`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(0);
    });
  });
});

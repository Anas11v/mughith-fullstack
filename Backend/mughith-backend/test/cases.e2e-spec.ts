import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CaseStatus, Role, Severity } from '@prisma/client';
import * as request from 'supertest';
import { CasesService } from '../src/modules/cases/cases.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';
import { createCase, createUser } from './helpers/factories';

describe('Cases (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let casesService: CasesService;

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    prisma = setup.prisma;
    jwtService = app.get(JwtService);
    casesService = app.get(CasesService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('POST /cases', () => {
    it('creates a case with explicit coordinates (DISPATCHER)', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });

      const res = await request(app.getHttpServer())
        .post('/cases')
        .set('Authorization', `Bearer ${token}`)
        .send({
          address: 'Al Haram, Makkah',
          severity: Severity.CRITICAL,
          latitude: 21.4225,
          longitude: 39.8262,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        address: 'Al Haram, Makkah',
        severity: Severity.CRITICAL,
        status: CaseStatus.OPEN,
        latitude: 21.4225,
        longitude: 39.8262,
      });
    });

    it('returns 403 for DONATOR', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
      });
      await request(app.getHttpServer())
        .post('/cases')
        .set('Authorization', `Bearer ${token}`)
        .send({
          address: 'X',
          severity: Severity.HIGH,
          latitude: 21.4,
          longitude: 39.8,
        })
        .expect(403);
    });

    it('returns 400 on invalid severity', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await request(app.getHttpServer())
        .post('/cases')
        .set('Authorization', `Bearer ${token}`)
        .send({
          address: 'Valid Address',
          severity: 'NOT_A_SEVERITY',
          latitude: 21.4,
          longitude: 39.8,
        })
        .expect(400);
    });
  });

  describe('GET /cases', () => {
    it('returns paginated list for DISPATCHER', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await createCase(prisma, disp.id, { severity: Severity.CRITICAL });
      await createCase(prisma, disp.id, { severity: Severity.LOW });

      const res = await request(app.getHttpServer())
        .get('/cases')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('filters by severity', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await createCase(prisma, disp.id, { severity: Severity.CRITICAL });
      await createCase(prisma, disp.id, { severity: Severity.LOW });

      const res = await request(app.getHttpServer())
        .get('/cases?severity=CRITICAL')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });

    it('returns 403 for DONATOR', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
      });
      await request(app.getHttpServer())
        .get('/cases')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('PATCH /cases/:id/status', () => {
    it('allows ASSIGNED → ON_SCENE', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const c = await createCase(prisma, disp.id, { status: CaseStatus.ASSIGNED });

      const res = await request(app.getHttpServer())
        .patch(`/cases/${c.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: CaseStatus.ON_SCENE })
        .expect(200);

      expect(res.body.status).toBe(CaseStatus.ON_SCENE);
    });

    it('rejects CLOSED → OPEN (illegal)', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const c = await createCase(prisma, disp.id, { status: CaseStatus.CLOSED });

      await request(app.getHttpServer())
        .patch(`/cases/${c.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: CaseStatus.OPEN })
        .expect(400);
    });
  });

  describe('PATCH /cases/:id/close', () => {
    it('closes and frees the donator', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const { user: donator } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
        isBusy: true,
      });
      const c = await createCase(prisma, disp.id, {
        status: CaseStatus.ON_SCENE,
        assignedToId: donator.id,
      });

      const res = await request(app.getHttpServer())
        .patch(`/cases/${c.id}/close`)
        .set('Authorization', `Bearer ${token}`)
        .send({ outcome: 'Patient stabilized' })
        .expect(200);

      expect(res.body.status).toBe(CaseStatus.CLOSED);
      expect(res.body.outcome).toBe('Patient stabilized');

      const freedDonator = await prisma.user.findUnique({
        where: { id: donator.id },
      });
      expect(freedDonator?.isBusy).toBe(false);
    });
  });

  describe('PATCH /cases/:id/ambulance-info (FLAW #3)', () => {
    it('updates ambulance info for ASSIGNED case', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const { user: donator } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
      });
      const c = await createCase(prisma, disp.id, {
        status: CaseStatus.ASSIGNED,
        assignedToId: donator.id,
      });

      const res = await request(app.getHttpServer())
        .patch(`/cases/${c.id}/ambulance-info`)
        .set('Authorization', `Bearer ${token}`)
        .send({ plate: 'ABC-1234', eta: '8 min', crew: 'Team Alpha' })
        .expect(200);

      expect(res.body.ambulancePlate).toBe('ABC-1234');
      expect(res.body.ambulanceEta).toBe('8 min');
      expect(res.body.ambulanceCrew).toBe('Team Alpha');
    });

    it('rejects ambulance-info on OPEN case', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const c = await createCase(prisma, disp.id, { status: CaseStatus.OPEN });

      await request(app.getHttpServer())
        .patch(`/cases/${c.id}/ambulance-info`)
        .set('Authorization', `Bearer ${token}`)
        .send({ plate: 'ABC-1234' })
        .expect(400);
    });
  });

  describe('PATCH /cases/:id/panic (FLAW #4)', () => {
    it('allows AMBULANCE_CREW to trigger', async () => {
      const { user: disp } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const { token } = await createUser(prisma, jwtService, {
        role: Role.AMBULANCE_CREW,
      });
      const c = await createCase(prisma, disp.id, { status: CaseStatus.ASSIGNED });

      const res = await request(app.getHttpServer())
        .patch(`/cases/${c.id}/panic`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.panicTriggered).toBe(true);
    });

    it('returns 403 for DISPATCHER', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const c = await createCase(prisma, disp.id, { status: CaseStatus.OPEN });

      await request(app.getHttpServer())
        .patch(`/cases/${c.id}/panic`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('Expiry cron (FLAW #1)', () => {
    it('expires OPEN cases past expiresAt', async () => {
      const { user: disp } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const c = await createCase(prisma, disp.id, {
        status: CaseStatus.OPEN,
        expiresAt: new Date(Date.now() - 60 * 1000),
      });

      await casesService.expireOldOpenCases();

      const fromDb = await prisma.case.findUnique({ where: { id: c.id } });
      expect(fromDb?.status).toBe(CaseStatus.EXPIRED);
    });

    it('does not expire cases with future expiresAt', async () => {
      const { user: disp } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const c = await createCase(prisma, disp.id, {
        status: CaseStatus.OPEN,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await casesService.expireOldOpenCases();

      const fromDb = await prisma.case.findUnique({ where: { id: c.id } });
      expect(fromDb?.status).toBe(CaseStatus.OPEN);
    });
  });
});

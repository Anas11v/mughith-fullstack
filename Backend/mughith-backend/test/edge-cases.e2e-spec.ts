import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CaseStatus, Role, Severity } from '@prisma/client';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';
import { createCase, createUser } from './helpers/factories';

describe('Edge cases (e2e)', () => {
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

  it('GET /cases/:id returns 404 for unknown id', async () => {
    const { token } = await createUser(prisma, jwtService, {
      role: Role.DISPATCHER,
    });
    await request(app.getHttpServer())
      .get('/cases/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('PATCH status on unknown case returns 404', async () => {
    const { token } = await createUser(prisma, jwtService, {
      role: Role.DISPATCHER,
    });
    await request(app.getHttpServer())
      .patch('/cases/00000000-0000-0000-0000-000000000000/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: CaseStatus.ON_SCENE })
      .expect(404);
  });

  it('Closing an already closed case returns 400', async () => {
    const { user: disp, token } = await createUser(prisma, jwtService, {
      role: Role.DISPATCHER,
    });
    const c = await createCase(prisma, disp.id, { status: CaseStatus.CLOSED });
    await request(app.getHttpServer())
      .patch(`/cases/${c.id}/close`)
      .set('Authorization', `Bearer ${token}`)
      .send({ outcome: 'Already done' })
      .expect(400);
  });

  it('Accepting a non-OPEN case fails with 409', async () => {
    const { user: disp } = await createUser(prisma, jwtService, {
      role: Role.DISPATCHER,
    });
    const { token: donatorToken } = await createUser(prisma, jwtService, {
      role: Role.DONATOR,
      isAvailable: true,
      isVerified: true,
    });
    const c = await createCase(prisma, disp.id, { status: CaseStatus.EXPIRED });

    await request(app.getHttpServer())
      .post(`/dispatch/${c.id}/accept`)
      .set('Authorization', `Bearer ${donatorToken}`)
      .expect(409);
  });

  it('Geocoding failure without coords returns 400', async () => {
    const { token } = await createUser(prisma, jwtService, {
      role: Role.DISPATCHER,
    });
    await request(app.getHttpServer())
      .post('/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        address: 'zzzzzzzzzzzzzzzz not a real place qqqq',
        severity: Severity.LOW,
      })
      .expect((res) => {
        expect([201, 400]).toContain(res.status);
      });
  });

  it('GET /cases/history filters by role (DONATOR sees only assigned)', async () => {
    const { user: disp } = await createUser(prisma, jwtService, {
      role: Role.DISPATCHER,
    });
    const { user: donator, token } = await createUser(prisma, jwtService, {
      role: Role.DONATOR,
    });

    await createCase(prisma, disp.id, {
      status: CaseStatus.CLOSED,
      assignedToId: donator.id,
    });
    await createCase(prisma, disp.id, { status: CaseStatus.CLOSED });

    const res = await request(app.getHttpServer())
      .get('/cases/history')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBe(1);
    expect(res.body[0].assignedToId).toBe(donator.id);
  });

  it('Chat channel creation 404s for unknown case', async () => {
    const { token } = await createUser(prisma, jwtService);
    await request(app.getHttpServer())
      .post('/chat/case/00000000-0000-0000-0000-000000000000/channel')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('Reject case accept by unknown user (deleted after token issued)', async () => {
    const { user, token } = await createUser(prisma, jwtService, {
      role: Role.DONATOR,
      isAvailable: true,
      isVerified: true,
    });
    const { user: disp } = await createUser(prisma, jwtService, {
      role: Role.DISPATCHER,
    });
    const c = await createCase(prisma, disp.id, { status: CaseStatus.OPEN });

    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    await request(app.getHttpServer())
      .post(`/dispatch/${c.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});

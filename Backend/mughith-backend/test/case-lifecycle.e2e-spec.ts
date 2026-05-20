import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CaseStatus, NotificationType, Role, Severity } from '@prisma/client';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';
import { createUser } from './helpers/factories';

describe('Full case lifecycle (e2e)', () => {
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

  it('create → dispatch → accept → close → history', async () => {
    const { token: dispToken } = await createUser(prisma, jwtService, {
      role: Role.DISPATCHER,
    });
    const { user: donator, token: donatorToken } = await createUser(
      prisma,
      jwtService,
      {
        role: Role.DONATOR,
        isAvailable: true,
        isVerified: true,
        latitude: 21.4225,
        longitude: 39.8262,
      },
    );

    const createRes = await request(app.getHttpServer())
      .post('/cases')
      .set('Authorization', `Bearer ${dispToken}`)
      .send({
        address: 'Al Haram, Makkah',
        severity: Severity.CRITICAL,
        latitude: 21.4225,
        longitude: 39.8262,
        radiusKm: 10,
      })
      .expect(201);

    const caseId = createRes.body.id;
    expect(createRes.body.status).toBe(CaseStatus.OPEN);

    const alert = await prisma.notification.findFirst({
      where: {
        userId: donator.id,
        caseId,
        type: NotificationType.CASE_ALERT,
      },
    });
    expect(alert).not.toBeNull();

    const acceptRes = await request(app.getHttpServer())
      .post(`/dispatch/${caseId}/accept`)
      .set('Authorization', `Bearer ${donatorToken}`)
      .expect(201);
    expect(acceptRes.body.status).toBe(CaseStatus.ASSIGNED);
    expect(acceptRes.body.assignedToId).toBe(donator.id);

    const busy = await prisma.user.findUnique({ where: { id: donator.id } });
    expect(busy?.isBusy).toBe(true);

    await request(app.getHttpServer())
      .patch(`/cases/${caseId}/ambulance-info`)
      .set('Authorization', `Bearer ${dispToken}`)
      .send({ plate: 'XYZ-9999', eta: '6 min' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/cases/${caseId}/status`)
      .set('Authorization', `Bearer ${donatorToken}`)
      .send({ status: CaseStatus.ON_SCENE })
      .expect(200);

    const closeRes = await request(app.getHttpServer())
      .patch(`/cases/${caseId}/close`)
      .set('Authorization', `Bearer ${dispToken}`)
      .send({ outcome: 'Patient stabilized, ambulance took over' })
      .expect(200);
    expect(closeRes.body.status).toBe(CaseStatus.CLOSED);

    const freed = await prisma.user.findUnique({ where: { id: donator.id } });
    expect(freed?.isBusy).toBe(false);

    const historyRes = await request(app.getHttpServer())
      .get('/cases/history')
      .set('Authorization', `Bearer ${donatorToken}`)
      .expect(200);

    expect(Array.isArray(historyRes.body)).toBe(true);
    expect(historyRes.body[0].id).toBe(caseId);
    expect(historyRes.body[0].status).toBe(CaseStatus.CLOSED);
  });
});

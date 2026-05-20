import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CaseStatus, Role, Severity } from '@prisma/client';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';
import { createCase, createUser } from './helpers/factories';

describe('DTO Validation (e2e)', () => {
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

  describe('RegisterDto', () => {
    it('rejects missing name', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'x@x.com', password: 'Pass1234' })
        .expect(400);
    });

    it('rejects empty password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'x@x.com', password: '', name: 'x' })
        .expect(400);
    });

    it('strips unknown fields via forbidNonWhitelisted', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'x@x.com',
          password: 'Pass1234',
          name: 'x',
          role: 'ADMIN',
        })
        .expect(400);
    });
  });

  describe('UpdateProfileDto', () => {
    it('rejects non-numeric latitude', async () => {
      const { token } = await createUser(prisma, jwtService);
      await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ latitude: 'not-a-number' })
        .expect(400);
    });

    it('rejects invalid certExpiry format', async () => {
      const { token } = await createUser(prisma, jwtService);
      await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ certExpiry: 'yesterday' })
        .expect(400);
    });
  });

  describe('CreateCaseDto', () => {
    it('rejects missing severity', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await request(app.getHttpServer())
        .post('/cases')
        .set('Authorization', `Bearer ${token}`)
        .send({ address: 'Somewhere' })
        .expect(400);
    });

    it('rejects short address', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await request(app.getHttpServer())
        .post('/cases')
        .set('Authorization', `Bearer ${token}`)
        .send({ address: 'x', severity: Severity.HIGH, latitude: 0, longitude: 0 })
        .expect(400);
    });

    it('rejects out-of-range latitude', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await request(app.getHttpServer())
        .post('/cases')
        .set('Authorization', `Bearer ${token}`)
        .send({
          address: 'Somewhere',
          severity: Severity.HIGH,
          latitude: 500,
          longitude: 0,
        })
        .expect(400);
    });

    it('rejects radiusKm above max (50)', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await request(app.getHttpServer())
        .post('/cases')
        .set('Authorization', `Bearer ${token}`)
        .send({
          address: 'Somewhere',
          severity: Severity.HIGH,
          latitude: 21,
          longitude: 39,
          radiusKm: 999,
        })
        .expect(400);
    });
  });

  describe('UpdateStatusDto', () => {
    it('rejects invalid status value', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const c = await createCase(prisma, disp.id, {
        status: CaseStatus.ASSIGNED,
      });
      await request(app.getHttpServer())
        .patch(`/cases/${c.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'NOT_A_STATUS' })
        .expect(400);
    });
  });

  describe('CloseCaseDto', () => {
    it('rejects outcome shorter than 5 chars', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const c = await createCase(prisma, disp.id, {
        status: CaseStatus.ON_SCENE,
      });
      await request(app.getHttpServer())
        .patch(`/cases/${c.id}/close`)
        .set('Authorization', `Bearer ${token}`)
        .send({ outcome: 'ok' })
        .expect(400);
    });
  });

  describe('PaginationQueryDto', () => {
    it('rejects page = 0', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await request(app.getHttpServer())
        .get('/users/donators?page=0&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('rejects limit above 100', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await request(app.getHttpServer())
        .get('/users/donators?page=1&limit=500')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });
});

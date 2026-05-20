import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';
import { createUser } from './helpers/factories';

describe('Guards (e2e)', () => {
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

  describe('JwtGuard', () => {
    it('allows access with a valid Bearer token', async () => {
      const { token } = await createUser(prisma, jwtService);
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('rejects missing Authorization header', async () => {
      await request(app.getHttpServer()).get('/users/profile').expect(401);
    });

    it('rejects non-Bearer scheme', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .expect(401);
    });

    it('rejects malformed token', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer not.a.jwt')
        .expect(401);
    });

    it('rejects token with wrong signature', async () => {
      const forged = jwtService.sign({ sub: 'x', role: 'ADMIN' }, { secret: 'other-secret' });
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${forged}`)
        .expect(401);
    });
  });

  describe('RolesGuard', () => {
    it('DISPATCHER can access /cases', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      await request(app.getHttpServer())
        .get('/cases')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('DONATOR forbidden from /cases', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
      });
      await request(app.getHttpServer())
        .get('/cases')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('ADMIN can verify a donator', async () => {
      const { token: adminToken } = await createUser(prisma, jwtService, {
        role: Role.ADMIN,
      });
      const { user: donator } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
      });
      await request(app.getHttpServer())
        .patch(`/users/${donator.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('DISPATCHER cannot verify a donator (admin only)', async () => {
      const { token: dispToken } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const { user: donator } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
      });
      await request(app.getHttpServer())
        .patch(`/users/${donator.id}/verify`)
        .set('Authorization', `Bearer ${dispToken}`)
        .expect(403);
    });

    it('AMBULANCE_CREW is the only role allowed to /panic', async () => {
      const { user: disp } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const target = await prisma.case.create({
        data: {
          address: 'x',
          latitude: 0,
          longitude: 0,
          severity: 'HIGH',
          status: 'ASSIGNED',
          radiusKm: 5,
          createdById: disp.id,
        },
      });

      for (const role of [Role.DISPATCHER, Role.DONATOR, Role.ADMIN]) {
        const { token } = await createUser(prisma, jwtService, { role });
        await request(app.getHttpServer())
          .patch(`/cases/${target.id}/panic`)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      }

      const { token: crewToken } = await createUser(prisma, jwtService, {
        role: Role.AMBULANCE_CREW,
      });
      await request(app.getHttpServer())
        .patch(`/cases/${target.id}/panic`)
        .set('Authorization', `Bearer ${crewToken}`)
        .expect(200);
    });
  });

  describe('@CurrentUser decorator', () => {
    it('extracts sub correctly on GET /auth/me', async () => {
      const { user, token } = await createUser(prisma, jwtService);
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.id).toBe(user.id);
    });
  });
});

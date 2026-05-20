import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CaseStatus, Role } from '@prisma/client';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';
import { createCase, createUser } from './helpers/factories';

describe('Chat (e2e)', () => {
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

  describe('POST /chat/case/:caseId/channel', () => {
    it('creates channel when case is assigned', async () => {
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
        .post(`/chat/case/${c.id}/channel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.channelId).toBe(`case-${c.id}`);
      expect(res.body.channelType).toBe('messaging');
      expect(res.body.members).toEqual(
        expect.arrayContaining([disp.id, donator.id]),
      );
    });

    it('rejects when case has no donator assigned', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const c = await createCase(prisma, disp.id, { status: CaseStatus.OPEN });

      await request(app.getHttpServer())
        .post(`/chat/case/${c.id}/channel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('rejects for closed case', async () => {
      const { user: disp, token } = await createUser(prisma, jwtService, {
        role: Role.DISPATCHER,
      });
      const { user: donator } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
      });
      const c = await createCase(prisma, disp.id, {
        status: CaseStatus.CLOSED,
        assignedToId: donator.id,
      });

      await request(app.getHttpServer())
        .post(`/chat/case/${c.id}/channel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('GET /chat/token', () => {
    it('returns a chat token for current user', async () => {
      const { token } = await createUser(prisma, jwtService, {
        role: Role.DONATOR,
      });

      const res = await request(app.getHttpServer())
        .get('/chat/token')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(0);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/chat/token').expect(401);
    });
  });
});

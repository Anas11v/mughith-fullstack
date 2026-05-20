import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const donator = {
    email: 'donator@example.com',
    password: 'Pass1234',
    name: 'Donator One',
  };

  async function createUserWithRole(
    email: string,
    role: 'DONATOR' | 'DISPATCHER' | 'ADMIN' | 'AMBULANCE_CREW',
    overrides: Partial<{ isVerified: boolean; isAvailable: boolean }> = {},
  ) {
    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash('Pass1234', 10),
        name: `${role} User`,
        role,
        ...overrides,
      },
    });
    const token = jwtService.sign({ sub: user.id, role: user.role });
    return { user, token };
  }

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

  describe('GET /users/profile', () => {
    it('returns current user profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(donator)
        .expect(201);

      const profile = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(200);

      expect(profile.body.email).toBe(donator.email);
      expect(profile.body).not.toHaveProperty('password');
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/users/profile').expect(401);
    });
  });

  describe('PATCH /users/profile', () => {
    it('updates name, phone and certification', async () => {
      const { token } = await createUserWithRole('d1@x.com', 'DONATOR');

      const res = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name', phone: '+966555555555', certification: 'BLS' })
        .expect(200);

      expect(res.body.name).toBe('New Name');
      expect(res.body.phone).toBe('+966555555555');
      expect(res.body.certification).toBe('BLS');
    });

    it('accepts latitude and longitude (FLAW #2 fix)', async () => {
      const { token } = await createUserWithRole('d2@x.com', 'DONATOR');

      const res = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ latitude: 24.7136, longitude: 46.6753 })
        .expect(200);

      expect(res.body.latitude).toBe(24.7136);
      expect(res.body.longitude).toBe(46.6753);
    });

    it('rejects unknown fields with 400', async () => {
      const { token } = await createUserWithRole('d3@x.com', 'DONATOR');

      await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ isVerified: true })
        .expect(400);
    });
  });

  describe('PATCH /users/availability', () => {
    it('toggles availability for DONATOR', async () => {
      const { token } = await createUserWithRole('d4@x.com', 'DONATOR');

      const res = await request(app.getHttpServer())
        .patch('/users/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ isAvailable: true })
        .expect(200);

      expect(res.body.isAvailable).toBe(true);
    });

    it('returns 403 for non-DONATOR roles', async () => {
      const { token } = await createUserWithRole('admin@x.com', 'ADMIN');

      await request(app.getHttpServer())
        .patch('/users/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ isAvailable: true })
        .expect(403);
    });

    it('returns 400 when isAvailable is missing', async () => {
      const { token } = await createUserWithRole('d5@x.com', 'DONATOR');

      await request(app.getHttpServer())
        .patch('/users/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });
  });

  describe('PATCH /users/:id/verify', () => {
    it('allows ADMIN to verify a donator', async () => {
      const { token: adminToken } = await createUserWithRole(
        'admin2@x.com',
        'ADMIN',
      );
      const { user: donatorUser } = await createUserWithRole(
        'd6@x.com',
        'DONATOR',
      );

      const res = await request(app.getHttpServer())
        .patch(`/users/${donatorUser.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.isVerified).toBe(true);
    });

    it('returns 403 when a DONATOR tries to verify another user', async () => {
      const { token } = await createUserWithRole('d7@x.com', 'DONATOR');
      const { user: target } = await createUserWithRole('d8@x.com', 'DONATOR');

      await request(app.getHttpServer())
        .patch(`/users/${target.id}/verify`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /users/donators', () => {
    it('allows DISPATCHER to list donators (paginated)', async () => {
      const { token } = await createUserWithRole('disp@x.com', 'DISPATCHER');
      await createUserWithRole('d9@x.com', 'DONATOR', { isAvailable: true });
      await createUserWithRole('d10@x.com', 'DONATOR', { isAvailable: false });

      const res = await request(app.getHttpServer())
        .get('/users/donators')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('filters by availability when query param is true', async () => {
      const { token } = await createUserWithRole('disp2@x.com', 'DISPATCHER');
      await createUserWithRole('d11@x.com', 'DONATOR', { isAvailable: true });
      await createUserWithRole('d12@x.com', 'DONATOR', { isAvailable: false });

      const res = await request(app.getHttpServer())
        .get('/users/donators?available=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].isAvailable).toBe(true);
      expect(res.body.meta.total).toBe(1);
    });

    it('respects page and limit', async () => {
      const { token } = await createUserWithRole('disp3@x.com', 'DISPATCHER');
      for (let i = 0; i < 5; i++) {
        await createUserWithRole(`bulk-${i}@x.com`, 'DONATOR');
      }

      const res = await request(app.getHttpServer())
        .get('/users/donators?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.meta).toMatchObject({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    });

    it('returns 403 when a DONATOR tries to list donators', async () => {
      const { token } = await createUserWithRole('d13@x.com', 'DONATOR');

      await request(app.getHttpServer())
        .get('/users/donators')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const validUser = {
    email: 'auth.test@example.com',
    password: 'Pass1234',
    name: 'Auth Tester',
    phone: '+966500000000',
  };

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    prisma = setup.prisma;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('creates a user and returns an access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUser)
        .expect(201);

      expect(res.body.user).toMatchObject({
        email: validUser.email,
        name: validUser.name,
        role: 'DONATOR',
        isVerified: false,
      });
      expect(res.body.user).not.toHaveProperty('password');
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.accessToken.length).toBeGreaterThan(20);
    });

    it('rejects duplicate email with 409', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUser)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUser)
        .expect(409);
    });

    it('rejects invalid payload (short password) with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...validUser, password: '123' })
        .expect(400);
    });

    it('rejects invalid email format with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...validUser, email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUser)
        .expect(201);
    });

    it('returns token for correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200);

      expect(res.body.user.email).toBe(validUser.email);
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('rejects wrong password with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: validUser.email, password: 'WrongPassX' })
        .expect(401);
    });

    it('rejects unknown email with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'Pass1234' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUser)
        .expect(201);
      token = res.body.accessToken;
    });

    it('returns current user when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.email).toBe(validUser.email);
      expect(res.body).not.toHaveProperty('password');
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('returns 401 with an invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });
});

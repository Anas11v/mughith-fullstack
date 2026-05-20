import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  async function createUser(email: string) {
    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash('Pass1234', 10),
        name: 'Notif User',
        role: Role.DONATOR,
      },
    });
    const token = jwtService.sign({ sub: user.id, role: user.role });
    return { user, token };
  }

  async function seedNotifications(userId: string, count: number) {
    const created = [];
    for (let i = 0; i < count; i++) {
      const n = await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.CASE_ALERT,
          message: `Alert ${i + 1}`,
        },
      });
      created.push(n);
    }
    return created;
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

  describe('GET /notifications', () => {
    it('returns empty array when user has no notifications', async () => {
      const { token } = await createUser('n1@x.com');

      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns all notifications for current user', async () => {
      const { user, token } = await createUser('n2@x.com');
      await seedNotifications(user.id, 3);

      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(3);
      expect(res.body[0].userId).toBe(user.id);
    });

    it('does not return notifications of other users', async () => {
      const { token } = await createUser('n3@x.com');
      const { user: otherUser } = await createUser('n3-other@x.com');
      await seedNotifications(otherUser.id, 2);

      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('filters to unread when ?unread=true', async () => {
      const { user, token } = await createUser('n4@x.com');
      const [first, second] = await seedNotifications(user.id, 2);
      await prisma.notification.update({
        where: { id: first.id },
        data: { read: true },
      });

      const res = await request(app.getHttpServer())
        .get('/notifications?unread=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(second.id);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/notifications').expect(401);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('marks a single notification as read', async () => {
      const { user, token } = await createUser('n5@x.com');
      const [notif] = await seedNotifications(user.id, 1);

      const res = await request(app.getHttpServer())
        .patch(`/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.read).toBe(true);

      const fromDb = await prisma.notification.findUnique({
        where: { id: notif.id },
      });
      expect(fromDb?.read).toBe(true);
    });

    it('returns 404 when marking a notification that belongs to another user', async () => {
      const { token } = await createUser('n6@x.com');
      const { user: otherUser } = await createUser('n6-other@x.com');
      const [notif] = await seedNotifications(otherUser.id, 1);

      await request(app.getHttpServer())
        .patch(`/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('marks every notification as read for current user', async () => {
      const { user, token } = await createUser('n7@x.com');
      await seedNotifications(user.id, 4);

      const res = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.count).toBe(4);

      const remainingUnread = await prisma.notification.count({
        where: { userId: user.id, read: false },
      });
      expect(remainingUnread).toBe(0);
    });

    it('does not mark notifications of other users as read', async () => {
      const { token } = await createUser('n8@x.com');
      const { user: otherUser } = await createUser('n8-other@x.com');
      await seedNotifications(otherUser.id, 3);

      await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const otherUnread = await prisma.notification.count({
        where: { userId: otherUser.id, read: false },
      });
      expect(otherUnread).toBe(3);
    });
  });
});

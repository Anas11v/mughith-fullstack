import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CaseStatus, Role } from '@prisma/client';
import { io as ioClient, Socket } from 'socket.io-client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';
import { createCase, createUser } from './helpers/factories';

function connectAuthed(baseUrl: string, token: string): Promise<Socket> {
  const socket = ioClient(`${baseUrl}/location`, {
    transports: ['websocket'],
    auth: { token },
    reconnection: false,
    forceNew: true,
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect timeout')), 5000);

    socket.once('connect', () => {
      setTimeout(() => {
        if (socket.connected) {
          clearTimeout(timer);
          resolve(socket);
        } else {
          clearTimeout(timer);
          reject(new Error('disconnected after handshake'));
        }
      }, 250);
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitForEvent<T = unknown>(
  socket: Socket,
  event: string,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout waiting for ${event}`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('Location WebSocket (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let baseUrl: string;

  beforeAll(async () => {
    const setup = await createTestApp({ listen: true });
    app = setup.app;
    prisma = setup.prisma;
    jwtService = app.get(JwtService);
    baseUrl = setup.baseUrl!;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('rejects connection without a valid token', async () => {
    await expect(
      connectAuthed(baseUrl, 'not-a-real-token'),
    ).rejects.toBeDefined();
  });

  it('updates donator location and broadcasts to subscribed room', async () => {
    const { user: disp, token: dispToken } = await createUser(prisma, jwtService, {
      role: Role.DISPATCHER,
    });
    const { user: donator, token: donatorToken } = await createUser(
      prisma,
      jwtService,
      {
        role: Role.DONATOR,
        isAvailable: true,
        isVerified: true,
        latitude: 21.4,
        longitude: 39.8,
      },
    );
    const c = await createCase(prisma, disp.id, {
      status: CaseStatus.ASSIGNED,
      assignedToId: donator.id,
      latitude: 21.4225,
      longitude: 39.8262,
    });

    const dispatcherSocket = await connectAuthed(baseUrl, dispToken);
    const donatorSocket = await connectAuthed(baseUrl, donatorToken);

    try {
      await new Promise<void>((resolve, reject) => {
        dispatcherSocket.emit(
          'location:subscribe',
          { caseId: c.id },
          (ack: { ok: boolean }) => {
            ack?.ok ? resolve() : reject(new Error('subscribe failed'));
          },
        );
      });

      const broadcast = waitForEvent<{ donatorId: string; distanceKm: number }>(
        dispatcherSocket,
        'location:update',
      );

      donatorSocket.emit('location:update', {
        caseId: c.id,
        latitude: 21.42,
        longitude: 39.825,
      });

      const payload = await broadcast;
      expect(payload.donatorId).toBe(donator.id);
      expect(typeof payload.distanceKm).toBe('number');

      const updated = await prisma.user.findUnique({
        where: { id: donator.id },
      });
      expect(updated?.latitude).toBeCloseTo(21.42, 3);
      expect(updated?.longitude).toBeCloseTo(39.825, 3);
    } finally {
      dispatcherSocket.disconnect();
      donatorSocket.disconnect();
    }
  });

  it('disconnects the stale socket when the same user reconnects (FLAW #7)', async () => {
    const { token } = await createUser(prisma, jwtService, {
      role: Role.DONATOR,
    });

    const first = await connectAuthed(baseUrl, token);
    const disconnected = new Promise<void>((resolve) => {
      first.once('disconnect', () => resolve());
    });

    const second = await connectAuthed(baseUrl, token);
    await disconnected;
    expect(first.connected).toBe(false);
    expect(second.connected).toBe(true);

    second.disconnect();
  });
});

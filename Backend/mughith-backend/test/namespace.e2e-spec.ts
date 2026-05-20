import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { io as ioClient, Socket } from 'socket.io-client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';
import { createUser } from './helpers/factories';

function tryConnect(
  url: string,
  token?: string,
  timeoutMs = 2000,
): Promise<Socket> {
  const socket = ioClient(url, {
    transports: ['websocket'],
    auth: token ? { token } : {},
    reconnection: false,
    forceNew: true,
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('connect timeout')),
      timeoutMs,
    );
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

describe('WebSocket namespaces (e2e)', () => {
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

  it('/location namespace accepts authenticated connections', async () => {
    const { token } = await createUser(prisma, jwtService, {
      role: Role.DONATOR,
    });
    const socket = await tryConnect(`${baseUrl}/location`, token);
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });

  it('/location namespace rejects missing token', async () => {
    await expect(tryConnect(`${baseUrl}/location`)).rejects.toBeDefined();
  });

  it('location:update events on /location do not leak to default namespace /', async () => {
    const { token } = await createUser(prisma, jwtService, {
      role: Role.DONATOR,
    });

    const locationClient = await tryConnect(`${baseUrl}/location`, token);

    const rootClient = ioClient(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    await new Promise<void>((resolve, reject) => {
      rootClient.once('connect', () => resolve());
      rootClient.once('connect_error', (err) => reject(err));
      setTimeout(() => reject(new Error('root connect timeout')), 2000);
    });

    let leaked = false;
    rootClient.on('location:update', () => {
      leaked = true;
    });

    locationClient.emit('location:update', {
      caseId: 'no-such-case',
      latitude: 21.4,
      longitude: 39.8,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(leaked).toBe(false);

    locationClient.disconnect();
    rootClient.disconnect();
  });
});

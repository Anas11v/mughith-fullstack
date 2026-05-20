import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { io as ioClient, Socket } from 'socket.io-client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app.helper';
import { createUser } from './helpers/factories';

function connect(baseUrl: string, token: string): Promise<Socket> {
  const socket = ioClient(`${baseUrl}/voip`, {
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

describe('VoIP WebSocket (e2e)', () => {
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

  it('rejects /voip connection without valid token', async () => {
    await expect(connect(baseUrl, 'not-real')).rejects.toBeDefined();
  });

  it('relays call:offer to target user as call:incoming', async () => {
    const { user: caller, token: callerToken } = await createUser(
      prisma,
      jwtService,
    );
    const { user: callee, token: calleeToken } = await createUser(
      prisma,
      jwtService,
    );

    const callerSocket = await connect(baseUrl, callerToken);
    const calleeSocket = await connect(baseUrl, calleeToken);

    try {
      const incoming = waitForEvent<{
        caseId: string;
        callerId: string;
        sdpOffer: unknown;
      }>(calleeSocket, 'call:incoming');

      await new Promise<void>((resolve, reject) => {
        callerSocket.emit(
          'call:offer',
          {
            caseId: 'case-1',
            targetUserId: callee.id,
            sdpOffer: { type: 'offer', sdp: 'v=0...' },
          },
          (ack: { ok: boolean }) => {
            ack?.ok ? resolve() : reject(new Error('offer rejected'));
          },
        );
      });

      const payload = await incoming;
      expect(payload.callerId).toBe(caller.id);
      expect(payload.caseId).toBe('case-1');
    } finally {
      callerSocket.disconnect();
      calleeSocket.disconnect();
    }
  });

  it('relays call:answer to caller as call:answered', async () => {
    const { user: caller, token: callerToken } = await createUser(
      prisma,
      jwtService,
    );
    const { user: callee, token: calleeToken } = await createUser(
      prisma,
      jwtService,
    );

    const callerSocket = await connect(baseUrl, callerToken);
    const calleeSocket = await connect(baseUrl, calleeToken);

    try {
      const answered = waitForEvent<{ calleeId: string; sdpAnswer: unknown }>(
        callerSocket,
        'call:answered',
      );

      calleeSocket.emit('call:answer', {
        caseId: 'case-1',
        targetUserId: caller.id,
        sdpAnswer: { type: 'answer', sdp: 'v=0...' },
      });

      const payload = await answered;
      expect(payload.calleeId).toBe(callee.id);
    } finally {
      callerSocket.disconnect();
      calleeSocket.disconnect();
    }
  });

  it('relays call:ice-candidate bidirectionally', async () => {
    const { user: a, token: tokenA } = await createUser(prisma, jwtService);
    const { user: b, token: tokenB } = await createUser(prisma, jwtService);

    const socketA = await connect(baseUrl, tokenA);
    const socketB = await connect(baseUrl, tokenB);

    try {
      const received = waitForEvent<{ fromId: string; candidate: unknown }>(
        socketB,
        'call:ice-candidate',
      );

      socketA.emit('call:ice-candidate', {
        caseId: 'case-1',
        targetUserId: b.id,
        candidate: { candidate: 'candidate:1 ...', sdpMLineIndex: 0 },
      });

      const payload = await received;
      expect(payload.fromId).toBe(a.id);
    } finally {
      socketA.disconnect();
      socketB.disconnect();
    }
  });

  it('relays call:end to target as call:ended', async () => {
    const { user: a, token: tokenA } = await createUser(prisma, jwtService);
    const { user: b, token: tokenB } = await createUser(prisma, jwtService);

    const socketA = await connect(baseUrl, tokenA);
    const socketB = await connect(baseUrl, tokenB);

    try {
      const ended = waitForEvent<{ fromId: string }>(socketB, 'call:ended');
      socketA.emit('call:end', { caseId: 'case-1', targetUserId: b.id });
      const payload = await ended;
      expect(payload.fromId).toBe(a.id);
    } finally {
      socketA.disconnect();
      socketB.disconnect();
    }
  });

  it('returns error when target user is offline', async () => {
    const { token } = await createUser(prisma, jwtService);
    const socket = await connect(baseUrl, token);

    try {
      const ack = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        socket.emit(
          'call:offer',
          {
            caseId: 'case-1',
            targetUserId: 'non-existent-user',
            sdpOffer: {},
          },
          resolve,
        );
      });
      expect(ack.ok).toBe(false);
      expect(ack.error).toContain('offline');
    } finally {
      socket.disconnect();
    }
  });
});

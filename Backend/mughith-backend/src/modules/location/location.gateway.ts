import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Interval } from '@nestjs/schedule';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  estimateEtaMinutes,
  haversineDistanceKm,
} from '../../common/utils/haversine';
import { PrismaService } from '../../prisma/prisma.service';

type AuthedSocket = Socket & {
  data: { userId?: string; role?: string };
};

interface LocationUpdatePayload {
  caseId: string;
  latitude: number;
  longitude: number;
}

interface SubscribePayload {
  caseId: string;
}

const SIGNAL_LOST_MS = 30_000;

@WebSocketGateway({ namespace: '/location', cors: { origin: true } })
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(LocationGateway.name);

  @WebSocketServer()
  private server!: Server;

  private userSockets = new Map<string, string>();
  private lastSeen = new Map<string, number>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; role: string }>(token);
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      const existing = this.userSockets.get(payload.sub);
      if (existing && existing !== client.id) {
        this.logger.debug(
          `Disconnecting stale socket ${existing} for user ${payload.sub}`,
        );
        this.server.in(existing).disconnectSockets(true);
      }
      this.userSockets.set(payload.sub, client.id);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket): void {
    const userId = client.data.userId;
    if (userId && this.userSockets.get(userId) === client.id) {
      this.userSockets.delete(userId);
      this.lastSeen.delete(userId);
    }
  }

  @SubscribeMessage('location:subscribe')
  handleSubscribe(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: SubscribePayload,
  ) {
    if (!body?.caseId) return { ok: false, error: 'caseId required' };
    client.join(this.roomFor(body.caseId));
    return { ok: true };
  }

  @SubscribeMessage('location:unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: SubscribePayload,
  ) {
    if (!body?.caseId) return { ok: false, error: 'caseId required' };
    client.leave(this.roomFor(body.caseId));
    return { ok: true };
  }

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: LocationUpdatePayload,
  ) {
    const userId = client.data.userId;
    if (!userId) return { ok: false, error: 'unauthenticated' };
    if (!body?.caseId) return { ok: false, error: 'caseId required' };

    await this.prisma.user.update({
      where: { id: userId },
      data: { latitude: body.latitude, longitude: body.longitude },
    });

    this.lastSeen.set(userId, Date.now());

    const targetCase = await this.prisma.case.findUnique({
      where: { id: body.caseId },
    });

    let distanceKm: number | null = null;
    let etaMinutes: number | null = null;
    if (targetCase) {
      distanceKm = haversineDistanceKm(
        { latitude: body.latitude, longitude: body.longitude },
        { latitude: targetCase.latitude, longitude: targetCase.longitude },
      );
      etaMinutes = estimateEtaMinutes(distanceKm);
    }

    this.server.to(this.roomFor(body.caseId)).emit('location:update', {
      donatorId: userId,
      caseId: body.caseId,
      latitude: body.latitude,
      longitude: body.longitude,
      distanceKm,
      etaMinutes,
      timestamp: new Date().toISOString(),
    });

    return { ok: true, distanceKm, etaMinutes };
  }

  @Interval(10_000)
  checkSignalLost(): void {
    if (!this.server) return;
    const now = Date.now();
    for (const [userId, lastAt] of this.lastSeen.entries()) {
      if (now - lastAt > SIGNAL_LOST_MS) {
        this.server.emit('location:signal-lost', {
          donatorId: userId,
          lastSeenAt: new Date(lastAt).toISOString(),
        });
        this.lastSeen.delete(userId);
      }
    }
  }

  private extractToken(client: AuthedSocket): string | undefined {
    const fromAuth = (client.handshake.auth as { token?: string } | undefined)
      ?.token;
    if (fromAuth) return fromAuth;

    const header = client.handshake.headers.authorization;
    if (header?.toLowerCase().startsWith('bearer ')) {
      return header.slice(7);
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') return queryToken;

    return undefined;
  }

  private roomFor(caseId: string): string {
    return `case:${caseId}`;
  }
}

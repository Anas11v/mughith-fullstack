import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

type AuthedSocket = Socket & {
  data: { userId?: string; role?: string };
};

interface OfferPayload {
  caseId: string;
  targetUserId: string;
  sdpOffer: unknown;
}

interface AnswerPayload {
  caseId: string;
  targetUserId: string;
  sdpAnswer: unknown;
}

interface IcePayload {
  caseId: string;
  targetUserId: string;
  candidate: unknown;
}

interface EndPayload {
  caseId: string;
  targetUserId: string;
}

@WebSocketGateway({ namespace: '/voip', cors: { origin: true } })
export class VoipGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VoipGateway.name);

  @WebSocketServer()
  private server!: Server;

  private userSockets = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        role: string;
      }>(token);
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      const existing = this.userSockets.get(payload.sub);
      if (existing && existing !== client.id) {
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
    }
  }

  @SubscribeMessage('call:offer')
  handleOffer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: OfferPayload,
  ) {
    const callerId = client.data.userId;
    if (!callerId) return { ok: false, error: 'unauthenticated' };
    if (!body?.targetUserId || !body?.caseId) {
      return { ok: false, error: 'targetUserId and caseId required' };
    }

    const targetSocketId = this.userSockets.get(body.targetUserId);
    if (!targetSocketId) {
      return { ok: false, error: 'target offline' };
    }

    this.server.to(targetSocketId).emit('call:incoming', {
      caseId: body.caseId,
      callerId,
      sdpOffer: body.sdpOffer,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:answer')
  handleAnswer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: AnswerPayload,
  ) {
    const calleeId = client.data.userId;
    if (!calleeId) return { ok: false, error: 'unauthenticated' };
    if (!body?.targetUserId || !body?.caseId) {
      return { ok: false, error: 'targetUserId and caseId required' };
    }

    const targetSocketId = this.userSockets.get(body.targetUserId);
    if (!targetSocketId) {
      return { ok: false, error: 'target offline' };
    }

    this.server.to(targetSocketId).emit('call:answered', {
      caseId: body.caseId,
      calleeId,
      sdpAnswer: body.sdpAnswer,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:ice-candidate')
  handleIce(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: IcePayload,
  ) {
    const fromId = client.data.userId;
    if (!fromId) return { ok: false, error: 'unauthenticated' };
    if (!body?.targetUserId) {
      return { ok: false, error: 'targetUserId required' };
    }

    const targetSocketId = this.userSockets.get(body.targetUserId);
    if (!targetSocketId) {
      return { ok: false, error: 'target offline' };
    }

    this.server.to(targetSocketId).emit('call:ice-candidate', {
      caseId: body.caseId,
      fromId,
      candidate: body.candidate,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:end')
  handleEnd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: EndPayload,
  ) {
    const fromId = client.data.userId;
    if (!fromId) return { ok: false, error: 'unauthenticated' };
    if (!body?.targetUserId) {
      return { ok: false, error: 'targetUserId required' };
    }

    const targetSocketId = this.userSockets.get(body.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('call:ended', {
        caseId: body.caseId,
        fromId,
      });
    }
    return { ok: true };
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
}

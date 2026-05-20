import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseStatus } from '@prisma/client';
import { StreamChatService } from '../../common/services/stream-chat.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly streamChat: StreamChatService,
  ) {}

  async createChannelForCase(caseId: string) {
    const target = await this.prisma.case.findUnique({
      where: { id: caseId },
    });
    if (!target) throw new NotFoundException('Case not found');
    if (!target.assignedToId) {
      throw new BadRequestException(
        'Chat channel requires an assigned donator',
      );
    }
    if (target.status === CaseStatus.CLOSED || target.status === CaseStatus.EXPIRED) {
      throw new BadRequestException('Cannot create channel for finished case');
    }

    return this.streamChat.createChannelForCase(
      caseId,
      target.createdById,
      target.assignedToId,
    );
  }

  generateToken(userId: string) {
    return { token: this.streamChat.generateToken(userId) };
  }
}

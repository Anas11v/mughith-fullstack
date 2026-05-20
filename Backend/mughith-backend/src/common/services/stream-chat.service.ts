import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamChat } from 'stream-chat';

export interface ChatChannel {
  channelId: string;
  channelType: string;
  members: string[];
}

@Injectable()
export class StreamChatService implements OnModuleInit {
  private readonly logger = new Logger(StreamChatService.name);
  private client: StreamChat | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.config.get<string>('STREAM_API_KEY');
    const apiSecret = this.config.get<string>('STREAM_API_SECRET');

    if (!apiKey || !apiSecret) {
      this.logger.warn(
        'Stream Chat credentials not provided; chat will operate in offline mode',
      );
      return;
    }

    this.client = StreamChat.getInstance(apiKey, apiSecret);
    this.logger.log('Stream Chat initialized');
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async createChannelForCase(
    caseId: string,
    dispatcherId: string,
    donatorId: string,
  ): Promise<ChatChannel> {
    const channelId = `case-${caseId}`;
    const channelType = 'messaging';
    const members = [dispatcherId, donatorId];

    if (!this.client) {
      this.logger.debug(`[stub] create channel ${channelId} for ${members}`);
      return { channelId, channelType, members };
    }

    try {
      await this.client.upsertUsers([
        { id: dispatcherId, role: 'user' },
        { id: donatorId, role: 'user' },
      ]);

      const channel = this.client.channel(channelType, channelId, {
        members,
        name: `Case ${caseId}`,
        created_by_id: dispatcherId,
      } as Record<string, unknown>);

      await channel.create();
    } catch (error) {
      this.logger.warn(
        `Stream createChannel failed: ${(error as Error).message}`,
      );
    }

    return { channelId, channelType, members };
  }

  generateToken(userId: string): string {
    if (!this.client) {
      return `stub-token-${userId}`;
    }
    return this.client.createToken(userId);
  }
}

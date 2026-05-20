import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not provided; push notifications will be logged only',
      );
      return;
    }

    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    this.logger.log('Firebase Admin initialized');
  }

  isEnabled(): boolean {
    return this.app !== null;
  }

  async sendToDevice(token: string, payload: PushPayload): Promise<void> {
    if (!this.app) {
      this.logger.debug(
        `[stub] push to ${token.slice(0, 8)}… title="${payload.title}"`,
      );
      return;
    }

    try {
      await this.app.messaging().send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
      });
    } catch (error) {
      this.logger.warn(`FCM send failed: ${(error as Error).message}`);
    }
  }
}

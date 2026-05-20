import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { FirebaseModule } from './common/services/firebase.module';
import { GeocodingModule } from './common/services/geocoding.module';
import { StreamChatModule } from './common/services/stream-chat.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { CasesModule } from './modules/cases/cases.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { ChatModule } from './modules/chat/chat.module';
import { LocationModule } from './modules/location/location.module';
import { VoipModule } from './modules/voip/voip.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    FirebaseModule,
    GeocodingModule,
    StreamChatModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
    HealthModule,
    DispatchModule,
    CasesModule,
    ChatModule,
    LocationModule,
    VoipModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

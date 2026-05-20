import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { LocationGateway } from './location.gateway';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [LocationGateway],
  exports: [LocationGateway],
})
export class LocationModule {}

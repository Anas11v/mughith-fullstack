import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VoipGateway } from './voip.gateway';

@Module({
  imports: [AuthModule],
  providers: [VoipGateway],
  exports: [VoipGateway],
})
export class VoipModule {}

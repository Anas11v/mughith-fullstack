import { Global, Module } from '@nestjs/common';
import { StreamChatService } from './stream-chat.service';

@Global()
@Module({
  providers: [StreamChatService],
  exports: [StreamChatService],
})
export class StreamChatModule {}

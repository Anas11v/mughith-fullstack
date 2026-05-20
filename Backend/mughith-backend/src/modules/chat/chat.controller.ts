import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('case/:caseId/channel')
  @ApiOperation({ summary: 'Create or fetch chat channel for a case' })
  createChannel(@Param('caseId') caseId: string) {
    return this.chatService.createChannelForCase(caseId);
  }

  @Get('token')
  @ApiOperation({ summary: 'Generate Stream chat token for current user' })
  getToken(@CurrentUser('sub') userId: string) {
    return this.chatService.generateToken(userId);
  }
}

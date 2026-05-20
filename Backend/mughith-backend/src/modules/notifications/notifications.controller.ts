import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiQuery({ name: 'unread', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Notifications returned' })
  @ApiUnauthorizedResponse({ description: 'Token missing or invalid' })
  getNotifications(
    @CurrentUser('sub') userId: string,
    @Query('unread') unread?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      userId,
      unread === 'true',
    );
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({ description: 'All notifications marked read' })
  markAllRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiOkResponse({ description: 'Notification marked read' })
  markRead(
    @Param('id') notificationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notificationsService.markRead(notificationId, userId);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: { userId: string },
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.listNotifications(user.userId, unreadOnly === 'true');
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: { userId: string }) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Patch(':id/read')
  markAsRead(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Post('push-token')
  registerPushToken(
    @CurrentUser() user: { userId: string },
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.notificationsService.registerPushToken(user.userId, dto.token, dto.platform);
  }

  @Delete('push-token/:token')
  unregisterPushToken(@Param('token') token: string) {
    return this.notificationsService.unregisterPushToken(token);
  }
}

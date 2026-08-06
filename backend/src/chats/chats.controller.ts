import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { ChatsService } from './chats.service';
import { ChatsGateway } from './chats.gateway';
import { CreateDirectChatDto } from './dto/create-direct-chat.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(
    private chatsService: ChatsService,
    private usersService: UsersService,
    private chatsGateway: ChatsGateway,
  ) {}

  @Get()
  listChats(@CurrentUser() user: { userId: string }) {
    return this.chatsService.listUserChats(user.userId);
  }

  @Get('search')
  search(
    @CurrentUser() user: { userId: string },
    @Query('query') query: string,
    @Query('chatId') chatId?: string,
  ) {
    return this.chatsService.searchMessages(user.userId, query, chatId);
  }

  @Post('direct')
  async createDirect(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateDirectChatDto,
  ) {
    const me = await this.usersService.findById(user.userId);
    if (!me) {
      throw new NotFoundException('Пользователь не найден');
    }
    const chat = await this.chatsService.getOrCreateDirectChat(
      me.companyId,
      user.userId,
      dto.targetUserId,
    );
    this.chatsGateway.joinUserToRoom(user.userId, chat.id);
    this.chatsGateway.joinUserToRoom(dto.targetUserId, chat.id);
    return chat;
  }

  @Get(':chatId/messages')
  getMessages(
    @CurrentUser() user: { userId: string },
    @Param('chatId') chatId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.chatsService.getMessages(chatId, user.userId, cursor);
  }

  @Post(':chatId/messages')
  sendMessage(
    @CurrentUser() user: { userId: string },
    @Param('chatId') chatId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.chatsService.sendMessage(chatId, user.userId, dto);
  }

  @Patch(':chatId/messages/:messageId')
  editMessage(
    @CurrentUser() user: { userId: string },
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.chatsService.editMessage(messageId, user.userId, dto);
  }

  @Delete(':chatId/messages/:messageId')
  deleteMessage(
    @CurrentUser() user: { userId: string },
    @Param('messageId') messageId: string,
  ) {
    return this.chatsService.deleteMessage(messageId, user.userId);
  }

  @Patch(':chatId/messages/:messageId/pin')
  pinMessage(
    @CurrentUser() user: { userId: string },
    @Param('messageId') messageId: string,
    @Body('isPinned') isPinned: boolean,
  ) {
    return this.chatsService.pinMessage(messageId, user.userId, isPinned);
  }

  @Post(':chatId/messages/:messageId/forward')
  forwardMessage(
    @CurrentUser() user: { userId: string },
    @Param('messageId') messageId: string,
    @Body() dto: ForwardMessageDto,
  ) {
    return this.chatsService.forwardMessage(messageId, dto.targetChatId, user.userId);
  }

  @Patch(':chatId/read')
  markAsRead(
    @CurrentUser() user: { userId: string },
    @Param('chatId') chatId: string,
  ) {
    return this.chatsService.markChatAsRead(chatId, user.userId);
  }
}

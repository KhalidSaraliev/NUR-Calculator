import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ChatsService } from './chats.service';
import { CreateMessageDto } from './dto/create-message.dto';

interface AuthedSocket extends Socket {
  userId?: string;
}

interface JwtPayload {
  sub: string;
}

/**
 * Real-time шлюз: доставка сообщений, online/offline, "печатает...",
 * отметки о прочтении. REST (ChatsController) остаётся источником
 * истины и используется для истории/пагинации/поиска.
 *
 * Клиент подключается с JWT в handshake:
 *   io("http://host/chats", { auth: { token: accessToken } })
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chats' })
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // Поле заполняется самим Nest/Socket.io после создания шлюза (через
  // декоратор), а не в конструкторе — отсюда "!": мы гарантируем
  // TypeScript, что к моменту вызова любого метода оно уже назначено.
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatsGateway.name);

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private chatsService: ChatsService,
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new Error('Токен не передан в handshake.auth.token или заголовке Authorization');
      }

      const payload = this.jwt.verify<JwtPayload>(token);
      const userId = payload.sub;
      client.userId = userId;

      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: true },
      });

      // подключаем сокет ко всем комнатам чатов, где он состоит + к личной комнате
      const memberships = await this.prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true },
      });
      memberships.forEach((m) => client.join(`chat:${m.chatId}`));
      client.join(`user:${userId}`);

      this.server.emit('presence:update', { userId, isOnline: true });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'неизвестная ошибка';
      this.logger.warn(`Отклонено подключение без валидного токена: ${reason}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthedSocket): Promise<void> {
    const userId = client.userId;
    if (!userId) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeenAt: new Date() },
    });

    this.server.emit('presence:update', { userId, isOnline: false });
  }

  @SubscribeMessage('message:send')
  async onMessageSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { chatId: string } & CreateMessageDto,
  ) {
    const userId = this.requireUserId(client);
    const { chatId, ...dto } = data;
    const message = await this.chatsService.sendMessage(chatId, userId, dto);
    this.server.to(`chat:${chatId}`).emit('message:new', message);
    return message;
  }

  @SubscribeMessage('message:edit')
  async onMessageEdit(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { chatId: string; messageId: string; text: string },
  ) {
    const userId = this.requireUserId(client);
    const message = await this.chatsService.editMessage(data.messageId, userId, {
      text: data.text,
    });
    this.server.to(`chat:${data.chatId}`).emit('message:updated', message);
    return message;
  }

  @SubscribeMessage('message:delete')
  async onMessageDelete(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { chatId: string; messageId: string },
  ) {
    const userId = this.requireUserId(client);
    const message = await this.chatsService.deleteMessage(data.messageId, userId);
    this.server.to(`chat:${data.chatId}`).emit('message:deleted', { id: message.id });
    return message;
  }

  @SubscribeMessage('typing:start')
  onTypingStart(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = this.requireUserId(client);
    client.to(`chat:${data.chatId}`).emit('typing:update', {
      chatId: data.chatId,
      userId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  onTypingStop(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = this.requireUserId(client);
    client.to(`chat:${data.chatId}`).emit('typing:update', {
      chatId: data.chatId,
      userId,
      isTyping: false,
    });
  }

  @SubscribeMessage('chat:read')
  async onChatRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = this.requireUserId(client);
    await this.chatsService.markChatAsRead(data.chatId, userId);
    this.server.to(`chat:${data.chatId}`).emit('chat:read', {
      chatId: data.chatId,
      userId,
      at: new Date(),
    });
  }

  /**
   * Вызывается из ChatsController/GroupsController сразу после создания
   * личного чата или группы (или добавления участника), чтобы уже
   * подключённый сокет пользователя сразу начал получать события по
   * новому чату, не дожидаясь переподключения.
   */
  joinUserToRoom(userId: string, chatId: string): void {
    this.server.in(`user:${userId}`).socketsJoin(`chat:${chatId}`);
  }

  /** JWT может прийти либо в handshake.auth.token, либо в заголовке Authorization */
  private extractToken(client: AuthedSocket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string') {
      return header.replace('Bearer ', '');
    }

    return undefined;
  }

  /** Гарантирует string вместо string | undefined во всех обработчиках событий */
  private requireUserId(client: AuthedSocket): string {
    if (!client.userId) {
      throw new WsException('Не авторизован');
    }
    return client.userId;
  }
}

import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ==================== ЧАТЫ ====================

  /** Возвращает существующий личный чат между userId и targetUserId, либо создаёт новый */
  async getOrCreateDirectChat(companyId: string, userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new ForbiddenException('Нельзя создать чат с самим собой');
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, companyId },
    });
    if (!target) throw new NotFoundException('Пользователь не найден в этой компании');

    const existing = await this.prisma.chat.findFirst({
      where: {
        type: 'DIRECT',
        companyId,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: { members: { include: { user: true } } },
    });
    if (existing) return existing;

    return this.prisma.chat.create({
      data: {
        type: 'DIRECT',
        companyId,
        members: {
          create: [
            { userId, role: 'MEMBER' },
            { userId: targetUserId, role: 'MEMBER' },
          ],
        },
      },
      include: { members: { include: { user: true } } },
    });
  }

  /** Список чатов пользователя: последнее сообщение + счётчик непрочитанных */
  async listUserChats(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeenAt: true,
              },
            },
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const withUnread = await Promise.all(
      chats.map(async (chat) => {
        const member = chat.members.find((m) => m.userId === userId);
        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            isDeleted: false,
            createdAt: { gt: member?.lastReadAt ?? new Date(0) },
          },
        });
        return { ...chat, unreadCount };
      }),
    );

    return withUnread;
  }

  async assertMember(chatId: string, userId: string) {
    const member = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!member) throw new ForbiddenException('Вы не участник этого чата');
    return member;
  }

  // ==================== СООБЩЕНИЯ ====================

  async getMessages(chatId: string, userId: string, cursor?: string, limit = 50) {
    await this.assertMember(chatId, userId);

    return this.prisma.message.findMany({
      where: { chatId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replyTo: true,
        attachments: true,
      },
    });
  }

  async sendMessage(chatId: string, senderId: string, dto: CreateMessageDto) {
    await this.assertMember(chatId, senderId);

    if (!dto.text && (!dto.attachmentIds || dto.attachmentIds.length === 0)) {
      throw new ForbiddenException('Сообщение не может быть пустым');
    }

    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        type: dto.type ?? 'TEXT',
        text: dto.text,
        replyToId: dto.replyToId,
        ...(dto.attachmentIds?.length
          ? { attachments: { connect: dto.attachmentIds.map((id) => ({ id })) } }
          : {}),
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replyTo: true,
        attachments: true,
      },
    });

    await this.prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

    this.notifications
      .notifyNewMessage(chatId, message)
      .catch((err) => this.logger.error(`Не удалось отправить уведомления: ${err.message}`));

    return message;
  }

  async editMessage(messageId: string, userId: string, dto: UpdateMessageDto) {
    await this.getOwnedMessage(messageId, userId);
    return this.prisma.message.update({
      where: { id: messageId },
      data: { text: dto.text, isEdited: true },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { chat: { include: { members: true } } },
    });
    if (!message) throw new NotFoundException('Сообщение не найдено');

    const member = message.chat.members.find((m) => m.userId === userId);
    const isOwner = message.senderId === userId;
    const isChatAdmin = member?.role === 'ADMIN' || member?.role === 'OWNER';

    if (!isOwner && !isChatAdmin) {
      throw new ForbiddenException('Недостаточно прав для удаления этого сообщения');
    }

    // soft-delete: текст стирается, но запись остаётся (нужна для order/аудита)
    return this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, text: null },
    });
  }

  async pinMessage(messageId: string, userId: string, isPinned: boolean) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Сообщение не найдено');
    await this.assertMember(message.chatId, userId);

    return this.prisma.message.update({ where: { id: messageId }, data: { isPinned } });
  }

  async forwardMessage(messageId: string, targetChatId: string, userId: string) {
    const original = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!original || original.isDeleted) throw new NotFoundException('Сообщение не найдено');
    await this.assertMember(targetChatId, userId);

    return this.prisma.message.create({
      data: {
        chatId: targetChatId,
        senderId: userId,
        type: original.type,
        text: original.text,
        forwardedFromId: original.id,
      },
    });
  }

  async markChatAsRead(chatId: string, userId: string) {
    await this.assertMember(chatId, userId);

    await this.prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadAt: new Date() },
    });

    const unread = await this.prisma.message.findMany({
      where: { chatId, senderId: { not: userId }, isDeleted: false },
      select: { id: true },
    });

    if (unread.length) {
      await this.prisma.messageRead.createMany({
        data: unread.map((m) => ({ messageId: m.id, userId })),
        skipDuplicates: true,
      });
    }

    return { ok: true };
  }

  async searchMessages(userId: string, query: string, chatId?: string) {
    return this.prisma.message.findMany({
      where: {
        isDeleted: false,
        text: { contains: query, mode: 'insensitive' },
        chat: { members: { some: { userId } } },
        ...(chatId ? { chatId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  private async getOwnedMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.isDeleted) throw new NotFoundException('Сообщение не найдено');
    if (message.senderId !== userId) {
      throw new ForbiddenException('Можно редактировать только свои сообщения');
    }
    return message;
  }
}

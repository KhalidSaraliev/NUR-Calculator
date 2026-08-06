import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private push: PushService,
  ) {}

  async registerPushToken(userId: string, token: string, platform: 'IOS' | 'ANDROID' | 'WEB') {
    return this.prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  async unregisterPushToken(token: string) {
    await this.prisma.pushToken.deleteMany({ where: { token } });
    return { ok: true };
  }

  async listNotifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    return { ok: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }

  /**
   * Уведомления о новом сообщении. Всем участникам чата, кроме автора
   * (и кроме тех, у кого чат заглушён), уходит NEW_MESSAGE — либо
   * MENTION, если в тексте есть их @упоминание.
   * Вызывается из ChatsService.sendMessage — не блокирует ответ API,
   * ошибки только логируются.
   */
  async notifyNewMessage(
    chatId: string,
    message: { id: string; text: string | null; senderId: string },
  ) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: { include: { user: true } } },
    });
    if (!chat) return;

    const sender = chat.members.find((m) => m.userId === message.senderId)?.user;
    const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Кто-то';

    const mentionedIds = this.extractMentionedUserIds(message.text ?? '', chat.members);
    const recipients = chat.members.filter((m) => m.userId !== message.senderId && !m.isMuted);

    for (const member of recipients) {
      const isMentioned = mentionedIds.includes(member.userId);
      await this.notify(member.userId, {
        type: isMentioned ? 'MENTION' : 'NEW_MESSAGE',
        title: isMentioned ? `${senderName} упомянул(а) вас` : senderName,
        body: message.text ?? '📎 Вложение',
        data: { chatId, messageId: message.id },
      });
    }
  }

  async notifyAddedToGroup(userId: string, groupId: string, groupName: string) {
    await this.notify(userId, {
      type: 'ADDED_TO_GROUP',
      title: 'Вас добавили в группу',
      body: groupName,
      data: { chatId: groupId },
    });
  }

  async notifyRoleChanged(userId: string, groupId: string, groupName: string, role: string) {
    await this.notify(userId, {
      type: 'ROLE_CHANGED',
      title: 'Изменение роли в группе',
      body: `Ваша роль в группе "${groupName}" теперь: ${role}`,
      data: { chatId: groupId },
    });
  }

  private async notify(
    userId: string,
    payload: {
      type: NotificationType;
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
      },
    });

    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    try {
      await this.push.sendToTokens(
        tokens.map((t) => t.token),
        { title: payload.title, body: payload.body, data: payload.data },
      );
    } catch (err) {
      // Под strict TypeScript переменная в catch имеет тип unknown, а не
      // any — обращаться к .message напрямую нельзя без проверки типа.
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Push-отправка не удалась для ${userId}: ${reason}`);
    }

    return notification;
  }

  /** Простое сопоставление @Имя / @ИмяФамилия с участниками чата (без формальных @username) */
  private extractMentionedUserIds(
    text: string,
    members: { userId: string; user: { firstName: string; lastName: string } }[],
  ): string[] {
    if (!text) return [];
    const mentionRegex = /@([\p{L}\p{N}_]+)/gu;
    const tokens = [...text.matchAll(mentionRegex)].map((m) => m[1].toLowerCase());
    if (!tokens.length) return [];

    const mentioned = new Set<string>();
    for (const member of members) {
      const first = member.user.firstName.toLowerCase();
      const full = `${member.user.firstName}${member.user.lastName}`.toLowerCase();
      if (tokens.some((t) => t === first || t === full)) {
        mentioned.add(member.userId);
      }
    }
    return [...mentioned];
  }
}

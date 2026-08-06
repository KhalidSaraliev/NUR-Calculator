import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

// Точный тип результата запроса с include — идиоматичный способ Prisma,
// в отличие от обращения к приватному методу класса через индексный тип
// (последнее строгий режим TypeScript не пропускает вне тела класса).
type GroupWithMembers = Prisma.ChatGetPayload<{
  include: { members: { include: { user: true } } };
}>;

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async createGroup(companyId: string, creatorId: string, dto: CreateGroupDto) {
    const memberIds = Array.from(new Set([creatorId, ...(dto.memberIds ?? [])]));

    const validMembers = await this.prisma.user.findMany({
      where: { id: { in: memberIds }, companyId },
      select: { id: true },
    });
    if (validMembers.length !== memberIds.length) {
      throw new BadRequestException(
        'Один или несколько пользователей не найдены в этой компании',
      );
    }

    return this.prisma.chat.create({
      data: {
        type: 'GROUP',
        companyId,
        name: dto.name,
        description: dto.description,
        avatarUrl: dto.avatarUrl,
        members: {
          create: memberIds.map((userId) => ({
            userId,
            role: userId === creatorId ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      include: { members: { include: { user: true } } },
    });
  }

  async getGroup(groupId: string, userId: string) {
    const group = await this.getGroupOrThrow(groupId);
    this.assertMember(group, userId);
    return group;
  }

  async updateGroup(groupId: string, userId: string, dto: UpdateGroupDto) {
    const group = await this.getGroupOrThrow(groupId);
    this.assertAdmin(group, userId);

    return this.prisma.chat.update({
      where: { id: groupId },
      data: { name: dto.name, description: dto.description, avatarUrl: dto.avatarUrl },
    });
  }

  async addMembers(groupId: string, actorId: string, companyId: string, memberIds: string[]) {
    const group = await this.getGroupOrThrow(groupId);
    this.assertAdmin(group, actorId);

    const validMembers = await this.prisma.user.findMany({
      where: { id: { in: memberIds }, companyId },
      select: { id: true },
    });
    if (validMembers.length !== memberIds.length) {
      throw new BadRequestException(
        'Один или несколько пользователей не найдены в этой компании',
      );
    }

    const existingIds = new Set(group.members.map((m) => m.userId));
    const toAdd = memberIds.filter((id) => !existingIds.has(id));

    if (toAdd.length) {
      await this.prisma.chatMember.createMany({
        data: toAdd.map((uid) => ({ chatId: groupId, userId: uid, role: 'MEMBER' })),
        skipDuplicates: true,
      });

      await Promise.all(
        toAdd.map((uid) =>
          this.notifications.notifyAddedToGroup(uid, groupId, group.name ?? 'Группа'),
        ),
      );
    }

    return { addedUserIds: toAdd, group: await this.getGroupOrThrow(groupId) };
  }

  async removeMember(groupId: string, actorId: string, targetUserId: string) {
    const group = await this.getGroupOrThrow(groupId);
    const isSelf = actorId === targetUserId;
    if (!isSelf) this.assertAdmin(group, actorId);

    const target = group.members.find((m) => m.userId === targetUserId);
    if (!target) throw new NotFoundException('Пользователь не состоит в этой группе');
    if (target.role === 'OWNER' && !isSelf) {
      throw new ForbiddenException('Нельзя удалить владельца группы');
    }

    await this.prisma.chatMember.delete({
      where: { chatId_userId: { chatId: groupId, userId: targetUserId } },
    });

    return { ok: true };
  }

  async changeMemberRole(
    groupId: string,
    actorId: string,
    targetUserId: string,
    role: 'ADMIN' | 'MEMBER',
  ) {
    const group = await this.getGroupOrThrow(groupId);
    const actor = group.members.find((m) => m.userId === actorId);
    if (actor?.role !== 'OWNER') {
      throw new ForbiddenException('Назначать администраторов группы может только владелец');
    }

    const target = group.members.find((m) => m.userId === targetUserId);
    if (!target) throw new NotFoundException('Пользователь не состоит в этой группе');
    if (target.role === 'OWNER') {
      throw new ForbiddenException('Нельзя изменить роль владельца группы');
    }

    const updated = await this.prisma.chatMember.update({
      where: { chatId_userId: { chatId: groupId, userId: targetUserId } },
      data: { role },
    });

    await this.notifications.notifyRoleChanged(
      targetUserId,
      groupId,
      group.name ?? 'Группа',
      role,
    );

    return updated;
  }

  leaveGroup(groupId: string, userId: string) {
    return this.removeMember(groupId, userId, userId);
  }

  async listPinned(groupId: string, userId: string) {
    const group = await this.getGroupOrThrow(groupId);
    this.assertMember(group, userId);

    return this.prisma.message.findMany({
      where: { chatId: groupId, isPinned: true, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  private async getGroupOrThrow(groupId: string) {
    const group = await this.prisma.chat.findUnique({
      where: { id: groupId },
      include: { members: { include: { user: true } } },
    });
    if (!group || group.type === 'DIRECT') {
      throw new NotFoundException('Группа не найдена');
    }
    return group;
  }

  private assertMember(group: GroupWithMembers, userId: string) {
    if (!group.members.some((m) => m.userId === userId)) {
      throw new ForbiddenException('Вы не участник этой группы');
    }
  }

  private assertAdmin(group: GroupWithMembers, userId: string) {
    const member = group.members.find((m) => m.userId === userId);
    if (!member || (member.role !== 'ADMIN' && member.role !== 'OWNER')) {
      throw new ForbiddenException('Требуются права администратора группы');
    }
  }
}

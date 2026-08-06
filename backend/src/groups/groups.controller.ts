import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { ChatsGateway } from '../chats/chats.gateway';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { ChangeRoleDto } from './dto/change-role.dto';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(
    private groupsService: GroupsService,
    private usersService: UsersService,
    private chatsGateway: ChatsGateway,
  ) {}

  @Post()
  async createGroup(@CurrentUser() user: { userId: string }, @Body() dto: CreateGroupDto) {
    const companyId = await this.getCompanyId(user.userId);
    const group = await this.groupsService.createGroup(companyId, user.userId, dto);
    group.members.forEach((m) => this.chatsGateway.joinUserToRoom(m.userId, group.id));
    return group;
  }

  @Get(':groupId')
  getGroup(@CurrentUser() user: { userId: string }, @Param('groupId') groupId: string) {
    return this.groupsService.getGroup(groupId, user.userId);
  }

  @Patch(':groupId')
  updateGroup(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.updateGroup(groupId, user.userId, dto);
  }

  @Post(':groupId/members')
  async addMembers(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Body() dto: AddMembersDto,
  ) {
    const companyId = await this.getCompanyId(user.userId);
    const { addedUserIds, group } = await this.groupsService.addMembers(
      groupId,
      user.userId,
      companyId,
      dto.memberIds,
    );
    addedUserIds.forEach((uid) => this.chatsGateway.joinUserToRoom(uid, groupId));
    return group;
  }

  @Delete(':groupId/members/:targetUserId')
  removeMember(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.groupsService.removeMember(groupId, user.userId, targetUserId);
  }

  @Patch(':groupId/members/:targetUserId/role')
  changeRole(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Param('targetUserId') targetUserId: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.groupsService.changeMemberRole(groupId, user.userId, targetUserId, dto.role);
  }

  @Post(':groupId/leave')
  leaveGroup(@CurrentUser() user: { userId: string }, @Param('groupId') groupId: string) {
    return this.groupsService.leaveGroup(groupId, user.userId);
  }

  @Get(':groupId/pinned')
  listPinned(@CurrentUser() user: { userId: string }, @Param('groupId') groupId: string) {
    return this.groupsService.listPinned(groupId, user.userId);
  }

  private async getCompanyId(userId: string): Promise<string> {
    const me = await this.usersService.findById(userId);
    if (!me) {
      throw new NotFoundException('Пользователь не найден');
    }
    return me.companyId;
  }
}

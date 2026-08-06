import { Injectable, ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  /** Завершение регистрации нового пользователя после подтверждения телефона */
  async completeProfile(phone: string, dto: CompleteProfileDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new ConflictException('Пользователь уже зарегистрирован');
    }

    // Первый пользователь компании становится владельцем.
    // В финальной версии это должно решаться отдельным сценарием
    // "создание компании администратором", а не эвристикой здесь.
    const usersCount = await this.prisma.user.count({
      where: { companyId: dto.companyId },
    });
    const role: UserRole = usersCount === 0 ? 'OWNER' : 'EMPLOYEE';

    const user = await this.prisma.user.create({
      data: {
        phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        position: dto.position,
        companyId: dto.companyId,
        departmentId: dto.departmentId,
        role,
      },
    });

    const tokens = await this.authService.issueTokens(user.id);
    return { user, ...tokens };
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { department: true },
    });
  }

  updateProfile(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  setOnlineStatus(id: string, isOnline: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isOnline, lastSeenAt: new Date() },
    });
  }

  // ---- Действия администратора ----

  listCompanyUsers(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      include: { department: true },
      orderBy: { firstName: 'asc' },
    });
  }

  blockUser(id: string, isBlocked: boolean) {
    return this.prisma.user.update({ where: { id }, data: { isBlocked } });
  }

  changeRole(id: string, role: UserRole) {
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  removeFromCompany(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}

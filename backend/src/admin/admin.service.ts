import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /** Данные для карточек Dashboard: сотрудники, активные, сообщения, файлы */
  async getDashboard(companyId: string) {
    const [employeesCount, activeUsersCount, messagesCount, filesCount] = await Promise.all([
      this.prisma.user.count({ where: { companyId } }),
      this.prisma.user.count({ where: { companyId, isOnline: true } }),
      this.prisma.message.count({ where: { chat: { companyId }, isDeleted: false } }),
      this.prisma.fileAsset.count({ where: { companyId } }),
    ]);

    return { employeesCount, activeUsersCount, messagesCount, filesCount };
  }

  getCompany(companyId: string) {
    return this.prisma.company.findUnique({ where: { id: companyId } });
  }

  updateCompany(companyId: string, dto: UpdateCompanyDto) {
    return this.prisma.company.update({ where: { id: companyId }, data: dto });
  }

  listDepartments(companyId: string) {
    return this.prisma.department.findMany({
      where: { companyId },
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(companyId: string, dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findFirst({
      where: { companyId, name: dto.name },
    });
    if (existing) throw new ConflictException('Отдел с таким названием уже существует');

    return this.prisma.department.create({ data: { companyId, name: dto.name } });
  }

  async updateDepartment(companyId: string, id: string, dto: UpdateDepartmentDto) {
    const dept = await this.prisma.department.findFirst({ where: { id, companyId } });
    if (!dept) throw new NotFoundException('Отдел не найден');

    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async deleteDepartment(companyId: string, id: string) {
    const dept = await this.prisma.department.findFirst({ where: { id, companyId } });
    if (!dept) throw new NotFoundException('Отдел не найден');

    await this.prisma.department.delete({ where: { id } });
    return { ok: true };
  }

  /** Все группы/каналы компании (не только те, где состоит текущий админ) */
  listGroups(companyId: string) {
    return this.prisma.chat.findMany({
      where: { companyId, type: { in: ['GROUP', 'CHANNEL'] } },
      include: { _count: { select: { members: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

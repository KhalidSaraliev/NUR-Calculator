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
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { AdminService } from './admin.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private usersService: UsersService,
  ) {}

  @Get('dashboard')
  async dashboard(@CurrentUser() user: { userId: string }) {
    const companyId = await this.getCompanyId(user.userId);
    return this.adminService.getDashboard(companyId);
  }

  @Get('company')
  async getCompany(@CurrentUser() user: { userId: string }) {
    const companyId = await this.getCompanyId(user.userId);
    return this.adminService.getCompany(companyId);
  }

  @Patch('company')
  async updateCompany(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateCompanyDto,
  ) {
    const companyId = await this.getCompanyId(user.userId);
    return this.adminService.updateCompany(companyId, dto);
  }

  @Get('departments')
  async listDepartments(@CurrentUser() user: { userId: string }) {
    const companyId = await this.getCompanyId(user.userId);
    return this.adminService.listDepartments(companyId);
  }

  @Post('departments')
  async createDepartment(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateDepartmentDto,
  ) {
    const companyId = await this.getCompanyId(user.userId);
    return this.adminService.createDepartment(companyId, dto);
  }

  @Patch('departments/:id')
  async updateDepartment(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    const companyId = await this.getCompanyId(user.userId);
    return this.adminService.updateDepartment(companyId, id, dto);
  }

  @Delete('departments/:id')
  async deleteDepartment(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const companyId = await this.getCompanyId(user.userId);
    return this.adminService.deleteDepartment(companyId, id);
  }

  @Get('groups')
  async listGroups(@CurrentUser() user: { userId: string }) {
    const companyId = await this.getCompanyId(user.userId);
    return this.adminService.listGroups(companyId);
  }

  /**
   * usersService.findById() возвращает User | null (это стандартное
   * поведение Prisma для findUnique) — этот helper в одном месте
   * превращает "может не найтись" в понятную 404-ошибку и гарантирует
   * TypeScript, что дальше companyId — точно string, а не string | undefined.
   */
  private async getCompanyId(userId: string): Promise<string> {
    const me = await this.usersService.findById(userId);
    if (!me) {
      throw new NotFoundException('Пользователь не найден');
    }
    return me.companyId;
  }
}

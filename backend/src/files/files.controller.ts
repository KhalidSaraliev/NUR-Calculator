import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { FilesService } from './files.service';

const MAX_UPLOAD_SIZE = 200 * 1024 * 1024; // 200 МБ на файл

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(
    private filesService: FilesService,
    private usersService: UsersService,
  ) {}

  /**
   * Загрузка файлов (поле формы "files", до 10 штук за раз —
   * требование "отправка нескольких фото"). Затем полученные id
   * передаются в attachmentIds при отправке сообщения:
   * POST /chats/:chatId/messages { attachmentIds: [...] }
   */
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, { limits: { fileSize: MAX_UPLOAD_SIZE } }),
  )
  async upload(
    @CurrentUser() user: { userId: string },
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const companyId = await this.getCompanyId(user.userId);
    return this.filesService.uploadFiles(companyId, user.userId, files);
  }

  /** Раздел "Файлы компании" — опционально ?category=IMAGE|VIDEO|VOICE|DOCUMENT|ARCHIVE|OTHER */
  @Get('company')
  async listCompanyFiles(
    @CurrentUser() user: { userId: string },
    @Query('category') category?: string,
  ) {
    const companyId = await this.getCompanyId(user.userId);
    return this.filesService.listCompanyFiles(companyId, category);
  }

  /** Раздел "Файлы группы" — всё, что отправлялось вложением в этот чат */
  @Get('group/:groupId')
  listGroupFiles(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
  ) {
    return this.filesService.listGroupFiles(groupId, user.userId);
  }

  @Get(':id')
  getFile(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.filesService.getFile(id, user.userId);
  }

  @Delete(':id')
  deleteFile(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.filesService.deleteFile(id, user.userId);
  }

  private async getCompanyId(userId: string): Promise<string> {
    const me = await this.usersService.findById(userId);
    if (!me) {
      throw new NotFoundException('Пользователь не найден');
    }
    return me.companyId;
  }
}

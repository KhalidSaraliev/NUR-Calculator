import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { FileAsset, FileCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

const MAX_ORIGINAL_FILE_SIZE = 200 * 1024 * 1024; // 200 МБ — жёсткий потолок на бэке
const VALID_CATEGORIES: FileCategory[] = [
  'IMAGE',
  'VIDEO',
  'VOICE',
  'DOCUMENT',
  'ARCHIVE',
  'OTHER',
];

/** Файл + временная подписанная ссылка на скачивание — то, что реально возвращаем клиенту */
type FileAssetWithUrl = FileAsset & { url: string };

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /** Загрузка одного или нескольких файлов (фото/видео/документы/голосовые) */
  async uploadFiles(
    companyId: string,
    userId: string,
    files: Express.Multer.File[],
  ): Promise<FileAssetWithUrl[]> {
    if (!files?.length) throw new BadRequestException('Нет файлов для загрузки');

    // Без явной аннотации TypeScript в строгом режиме выводит тип [] как
    // never[] в момент объявления — .push() ниже был бы ошибкой TS2345
    // ("Argument of type X is not assignable to parameter of type never").
    const created: FileAssetWithUrl[] = [];
    for (const file of files) {
      if (file.size > MAX_ORIGINAL_FILE_SIZE) {
        throw new BadRequestException(`Файл "${file.originalname}" превышает лимит 200 МБ`);
      }

      const category = this.detectCategory(file.mimetype);
      let buffer = file.buffer;
      let mimeType = file.mimetype;

      // сжимаем фото перед загрузкой (требование ТЗ: "сжатие")
      if (category === 'IMAGE') {
        ({ buffer, mimeType } = await this.compressImage(buffer));
      }

      const storageKey = `${companyId}/${category.toLowerCase()}/${crypto.randomUUID()}-${this.sanitizeFileName(
        file.originalname,
      )}`;

      await this.storage.upload(storageKey, buffer, mimeType);

      const asset = await this.prisma.fileAsset.create({
        data: {
          companyId,
          uploadedById: userId,
          category,
          fileName: file.originalname,
          mimeType,
          sizeBytes: buffer.length,
          storageKey,
        },
      });

      created.push({ ...asset, url: await this.storage.getSignedUrl(storageKey) });
    }

    return created;
  }

  /** Раздел "Файлы компании": все документы, кто загрузил, дата загрузки */
  async listCompanyFiles(companyId: string, category?: string) {
    const files = await this.prisma.fileAsset.findMany({
      where: {
        companyId,
        ...(category && VALID_CATEGORIES.includes(category as FileCategory)
          ? { category: category as FileCategory }
          : {}),
      },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return this.withSignedUrls(files);
  }

  /** "Файлы группы": всё, что отправлено вложением в конкретный чат/группу */
  async listGroupFiles(groupId: string, userId: string) {
    const member = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: groupId, userId } },
    });
    if (!member) throw new ForbiddenException('Вы не участник этого чата');

    const files = await this.prisma.fileAsset.findMany({
      where: { message: { chatId: groupId } },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return this.withSignedUrls(files);
  }

  async getFile(id: string, userId: string) {
    const file = await this.prisma.fileAsset.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Файл не найден');

    const requester = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!requester || requester.companyId !== file.companyId) {
      throw new ForbiddenException('Нет доступа к этому файлу');
    }

    return { ...file, url: await this.storage.getSignedUrl(file.storageKey) };
  }

  async deleteFile(id: string, userId: string) {
    const file = await this.prisma.fileAsset.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Файл не найден');

    const requester = await this.prisma.user.findUnique({ where: { id: userId } });
    const isUploader = file.uploadedById === userId;
    const isCompanyAdmin = requester?.role === 'OWNER' || requester?.role === 'ADMIN';

    if (!isUploader && !isCompanyAdmin) {
      throw new ForbiddenException('Недостаточно прав для удаления этого файла');
    }

    await this.storage.delete(file.storageKey);
    await this.prisma.fileAsset.delete({ where: { id } });
    return { ok: true };
  }

  private async withSignedUrls<T extends { storageKey: string }>(files: T[]) {
    return Promise.all(
      files.map(async (f) => ({ ...f, url: await this.storage.getSignedUrl(f.storageKey) })),
    );
  }

  private detectCategory(mimeType: string): FileCategory {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    if (mimeType.startsWith('audio/')) return 'VOICE';

    const archiveTypes = [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
    ];
    if (archiveTypes.includes(mimeType)) return 'ARCHIVE';

    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (documentTypes.includes(mimeType)) return 'DOCUMENT';

    return 'OTHER';
  }

  /** Ресайз до 1920px по большей стороне + JPEG качество 80 — баланс размер/качество */
  private async compressImage(buffer: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
    const output = await sharp(buffer)
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return { buffer: output, mimeType: 'image/jpeg' };
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  }
}

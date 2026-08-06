import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType = MessageType.TEXT;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;

  // id уже загруженных файлов (загрузка в S3 — Этап 3)
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireEnv } from '../common/config/env';

/**
 * Обёртка над S3-совместимым хранилищем (MinIO локально,
 * AWS S3 / любой S3-совместимый провайдер в проде).
 * Файлы в БД хранятся только как метаданные (см. модель FileAsset) —
 * бинарные данные никогда не идут через PostgreSQL.
 */
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = requireEnv('S3_BUCKET');
    this.client = new S3Client({
      endpoint: requireEnv('S3_ENDPOINT'),
      region: 'us-east-1', // не используется MinIO, но обязателен для SDK
      credentials: {
        accessKeyId: requireEnv('S3_ACCESS_KEY'),
        secretAccessKey: requireEnv('S3_SECRET_KEY'),
      },
      forcePathStyle: true, // обязательно для MinIO
    });
  }

  async upload(key: string, body: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /** Временная подписанная ссылка на скачивание/просмотр (по умолчанию 1 час) */
  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

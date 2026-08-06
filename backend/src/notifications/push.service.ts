import { Injectable, Logger } from '@nestjs/common';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Абстракция над push-провайдером. Firebase Cloud Messaging одним SDK
 * покрывает iOS/Android/Web push — рекомендуемый выбор для этого стека.
 * Сейчас — dev-заглушка, пишет в лог. Подключение реального FCM:
 *   npm i firebase-admin
 *   инициализировать admin.messaging() и заменить реализацию ниже.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async sendToTokens(tokens: string[], notification: PushPayload): Promise<void> {
    if (!tokens.length) return;
    // TODO: интеграция с Firebase Cloud Messaging (firebase-admin)
    this.logger.log(
      `[DEV] Push → ${tokens.length} устройство(а): "${notification.title}" — ${notification.body}`,
    );
  }
}

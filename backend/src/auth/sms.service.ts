import { Injectable, Logger } from '@nestjs/common';

/**
 * Абстракция над SMS-провайдером.
 * В продакшене подключите реального провайдера (Twilio, SMS.ru,
 * локального оператора и т.д.) — просто замените реализацию send().
 * Сейчас это dev-заглушка, которая пишет код в лог.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async send(phone: string, code: string): Promise<void> {
    // TODO: интеграция с реальным SMS-провайдером
    this.logger.log(`[DEV] Код подтверждения для ${phone}: ${code}`);
  }
}

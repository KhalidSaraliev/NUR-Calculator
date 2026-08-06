import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private sms: SmsService,
  ) {}

  /** Шаг 1: запросить одноразовый код на телефон */
  async requestOtp(phone: string) {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут

    await this.prisma.otpCode.create({
      data: { phone, code, expiresAt },
    });

    await this.sms.send(phone, code);

    return { message: 'Код отправлен' };
  }

  /** Шаг 2: подтвердить код. Если пользователь новый — вернуть isNewUser=true,
   *  фронт должен показать экран заполнения профиля (см. UsersService.completeProfile) */
  async verifyOtp(phone: string, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, code, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new UnauthorizedException('Неверный или истёкший код');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { phone } });

    if (user?.isBlocked) {
      throw new ForbiddenException('Пользователь заблокирован администратором');
    }

    if (!user) {
      return { isNewUser: true };
    }

    return { isNewUser: false, ...(await this.issueTokens(user.id)) };
  }

  async issueTokens(userId: string) {
    const accessToken = this.jwt.sign({ sub: userId }, { expiresIn: '15m' });
    const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenRaw)
      .digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
      },
    });

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  private generateCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000)); // 4-значный код
  }
}

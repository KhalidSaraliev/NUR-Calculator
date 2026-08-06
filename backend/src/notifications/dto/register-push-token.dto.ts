import { IsIn, IsString } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  token: string;

  @IsIn(['IOS', 'ANDROID', 'WEB'])
  platform: 'IOS' | 'ANDROID' | 'WEB';
}

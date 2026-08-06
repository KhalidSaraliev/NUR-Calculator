import { IsString, IsOptional, IsUUID } from 'class-validator';

/** Заполняется на экране регистрации после подтверждения SMS-кода */
export class CompleteProfileDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

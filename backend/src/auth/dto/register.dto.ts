import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  clubName: string;

  @IsString()
  @IsOptional()
  clubCity?: string;

  @IsString()
  @IsOptional()
  clubCountry?: string;
}

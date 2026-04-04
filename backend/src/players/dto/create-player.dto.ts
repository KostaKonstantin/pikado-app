import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  fullName: string;

  @IsString()
  @IsOptional()
  nickname?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsObject()
  @IsOptional()
  avatar?: Record<string, any>;
}

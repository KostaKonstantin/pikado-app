import { IsString, IsOptional } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  fullName: string;

  @IsString()
  @IsOptional()
  nickname?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

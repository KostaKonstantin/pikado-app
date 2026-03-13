import { IsString, IsEnum, IsOptional, IsNumber, IsUUID } from 'class-validator';
import { TournamentFormat } from '../../common/enums';

export class CreateTournamentDto {
  @IsString()
  name: string;

  @IsEnum(TournamentFormat)
  @IsOptional()
  format?: TournamentFormat;

  @IsUUID()
  @IsOptional()
  seasonId?: string;

  @IsNumber()
  @IsOptional()
  setsToWin?: number;

  @IsNumber()
  @IsOptional()
  legsPerSet?: number;

  @IsNumber()
  @IsOptional()
  startingScore?: number;

  @IsNumber()
  @IsOptional()
  groupCount?: number;
}

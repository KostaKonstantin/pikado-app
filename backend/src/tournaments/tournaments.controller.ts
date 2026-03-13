import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubMembershipGuard } from '../common/guards/club-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClubRole } from '../common/enums';

@Controller('clubs/:clubId/tournaments')
@UseGuards(JwtAuthGuard, ClubMembershipGuard, RolesGuard)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  findAll(@Param('clubId') clubId: string, @Query('seasonId') seasonId?: string) {
    return this.tournamentsService.findAll(clubId, seasonId);
  }

  @Get(':id')
  findOne(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.tournamentsService.findOne(clubId, id);
  }

  @Get(':id/bracket')
  getBracket(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.tournamentsService.getBracket(clubId, id);
  }

  @Get(':id/players')
  getPlayers(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.tournamentsService.getPlayers(clubId, id);
  }

  @Post()
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  create(@Param('clubId') clubId: string, @Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(clubId, dto);
  }

  @Patch(':id')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  update(@Param('clubId') clubId: string, @Param('id') id: string, @Body() dto: Partial<CreateTournamentDto>) {
    return this.tournamentsService.update(clubId, id, dto);
  }

  @Delete(':id')
  @Roles(ClubRole.CLUB_ADMIN)
  remove(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.tournamentsService.remove(clubId, id);
  }

  @Post(':id/players')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  addPlayer(@Param('clubId') clubId: string, @Param('id') id: string, @Body('playerId') playerId: string) {
    return this.tournamentsService.addPlayer(clubId, id, playerId);
  }

  @Delete(':id/players/:playerId')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  removePlayer(@Param('clubId') clubId: string, @Param('id') id: string, @Param('playerId') playerId: string) {
    return this.tournamentsService.removePlayer(clubId, id, playerId);
  }

  @Patch(':id/players/seed')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  updateSeeds(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() body: { seeds: { playerId: string; seed: number }[] },
  ) {
    return this.tournamentsService.updateSeeds(clubId, id, body.seeds);
  }

  @Post(':id/generate')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  generate(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.tournamentsService.generateBracket(clubId, id);
  }

  @Post(':id/start')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  start(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.tournamentsService.start(clubId, id);
  }
}

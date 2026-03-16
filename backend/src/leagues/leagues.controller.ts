import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubMembershipGuard } from '../common/guards/club-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClubRole } from '../common/enums';

@Controller('clubs/:clubId/leagues')
@UseGuards(JwtAuthGuard, ClubMembershipGuard, RolesGuard)
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get()
  findAll(@Param('clubId') clubId: string, @Query('seasonId') seasonId?: string) {
    return this.leaguesService.findAll(clubId, seasonId);
  }

  @Get(':id')
  findOne(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.leaguesService.findOne(clubId, id);
  }

  @Get(':id/standings')
  getStandings(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.leaguesService.getStandings(clubId, id);
  }

  @Get(':id/fixtures')
  getFixtures(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.leaguesService.getFixtures(clubId, id);
  }

  @Get(':id/players')
  getPlayers(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.leaguesService.getPlayers(clubId, id);
  }

  @Post()
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  create(@Param('clubId') clubId: string, @Body() body: any) {
    return this.leaguesService.create(clubId, body);
  }

  @Patch(':id')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  update(@Param('clubId') clubId: string, @Param('id') id: string, @Body() body: any) {
    return this.leaguesService.update(clubId, id, body);
  }

  @Delete(':id')
  @Roles(ClubRole.CLUB_ADMIN)
  remove(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.leaguesService.remove(clubId, id);
  }

  @Post(':id/players')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  addPlayer(@Param('clubId') clubId: string, @Param('id') id: string, @Body('playerId') playerId: string) {
    return this.leaguesService.addPlayer(clubId, id, playerId);
  }

  @Delete(':id/players/:playerId')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  removePlayer(@Param('clubId') clubId: string, @Param('id') id: string, @Param('playerId') playerId: string) {
    return this.leaguesService.removePlayer(clubId, id, playerId);
  }

  @Post(':id/generate')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  generateFixtures(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.leaguesService.generateFixtures(clubId, id);
  }

  @Patch(':id/matches/:matchId')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  updateMatchResult(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body() body: { homeSets: number; awaySets: number },
  ) {
    return this.leaguesService.updateMatchResult(clubId, id, matchId, body.homeSets, body.awaySets);
  }

  @Post(':id/evenings/:eveningNum/preview-substitutions')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  previewSubstitutions(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('eveningNum') eveningNum: string,
    @Body() body: { substitutions: { absentId: string; substituteId: string }[] },
  ) {
    return this.leaguesService.previewSubstitutions(clubId, id, parseInt(eveningNum), body.substitutions);
  }

  @Post(':id/evenings/:eveningNum/apply-substitutions')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  applySubstitutions(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('eveningNum') eveningNum: string,
    @Body() body: { substitutions: { absentId: string; substituteId: string }[] },
  ) {
    return this.leaguesService.applySubstitutions(clubId, id, parseInt(eveningNum), body.substitutions);
  }

  @Patch(':id/matches/:matchId/postpone')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  postponeMatch(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body() body: { scheduledDate?: string | null; isPostponed?: boolean },
  ) {
    return this.leaguesService.postponeMatch(clubId, id, matchId, body);
  }
}

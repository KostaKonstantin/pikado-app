import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { SessionService } from './session.service';
import { EuroleagueService } from './euroleague.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubMembershipGuard } from '../common/guards/club-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClubRole } from '../common/enums';

@Controller('clubs/:clubId/leagues')
@UseGuards(JwtAuthGuard, ClubMembershipGuard, RolesGuard)
export class LeaguesController {
  constructor(
    private readonly leaguesService: LeaguesService,
    private readonly sessionService: SessionService,
    private readonly euroleagueService: EuroleagueService,
  ) {}

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

  @Get(':id/stats')
  getScheduleStats(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Query('phaseId') phaseId?: string,
  ) {
    return this.leaguesService.getScheduleStats(clubId, id, phaseId);
  }

  @Get(':id/fixtures')
  getFixtures(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.leaguesService.getFixtures(clubId, id);
  }

  @Get(':id/substitutions')
  getSubstitutions(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.leaguesService.getSubstitutions(clubId, id);
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

  @Post(':id/matches/:matchId/walkover')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  recordWalkover(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body('walkoverId') walkoverId: string,
  ) {
    return this.leaguesService.recordWalkover(clubId, id, matchId, walkoverId);
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

  // ─── Sessions ──────────────────────────────────────────────────────────────

  @Get(':id/sessions')
  getSessions(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Query('phaseId') phaseId?: string,
  ) {
    return this.sessionService.getSessions(clubId, id, phaseId);
  }

  @Get(':id/sessions/pool')
  getPoolInfo(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.sessionService.getPoolInfo(clubId, id);
  }

  @Get(':id/sessions/:sessionId')
  getSession(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionService.getSession(clubId, id, sessionId);
  }

  @Post(':id/sessions/preview')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  previewSession(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() body: { presentPlayerIds: string[]; maxMatchesPerPlayer?: number },
  ) {
    return this.sessionService.previewSession(
      clubId, id, body.presentPlayerIds, body.maxMatchesPerPlayer,
    );
  }

  @Post(':id/sessions')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  createSession(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() body: { presentPlayerIds: string[]; maxMatchesPerPlayer?: number; sessionDate?: string | null },
  ) {
    return this.sessionService.createSession(clubId, id, body);
  }

  @Patch(':id/sessions/:sessionId/close')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  closeSession(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionService.closeSession(clubId, id, sessionId);
  }

  @Delete(':id/sessions/:sessionId')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  deleteSession(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionService.deleteSession(clubId, id, sessionId);
  }

  @Get(':id/sessions/:sessionId/match-check')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  checkManualMatch(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Query('homePlayerId') homePlayerId: string,
    @Query('awayPlayerId') awayPlayerId: string,
  ) {
    return this.sessionService.checkManualMatch(clubId, id, sessionId, homePlayerId, awayPlayerId);
  }

  @Post(':id/sessions/:sessionId/matches')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  addManualMatch(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Body() body: { homePlayerId: string; awayPlayerId: string },
  ) {
    return this.sessionService.addManualMatch(clubId, id, sessionId, body.homePlayerId, body.awayPlayerId);
  }

  // ─── EvroLiga phases ────────────────────────────────────────────────────────

  @Post(':id/euroleague/init')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  initPhases(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.euroleagueService.initPhases(clubId, id);
  }

  @Get(':id/phases')
  getPhases(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.euroleagueService.getPhases(clubId, id);
  }

  @Get(':id/phases/:phaseId')
  getPhase(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
  ) {
    return this.euroleagueService.getPhase(clubId, id, phaseId);
  }

  @Get(':id/phases/:phaseId/fixtures')
  getPhaseFixtures(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
  ) {
    return this.euroleagueService.getPhaseFixtures(clubId, id, phaseId);
  }

  @Get(':id/phases/:phaseId/standings')
  getPhaseStandings(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
  ) {
    return this.euroleagueService.getPhaseStandings(clubId, id, phaseId);
  }

  @Patch(':id/phases/:phaseId/matches/:matchId')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  updatePhaseMatch(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Param('matchId') matchId: string,
    @Body() body: { homeSets: number; awaySets: number },
  ) {
    return this.euroleagueService.updatePhaseMatch(clubId, id, phaseId, matchId, body.homeSets, body.awaySets);
  }

  @Post(':id/phases/advance')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  advancePhase(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.euroleagueService.advanceToNextPhase(clubId, id);
  }
}

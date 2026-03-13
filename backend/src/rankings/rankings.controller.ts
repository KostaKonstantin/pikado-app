import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { RankingsService } from './rankings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubMembershipGuard } from '../common/guards/club-membership.guard';

@Controller('clubs/:clubId/rankings')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  getRankings(@Param('clubId') clubId: string, @Query('seasonId') seasonId?: string) {
    return this.rankingsService.getClubRankings(clubId, seasonId);
  }

  @Post('recalculate')
  recalculate(@Param('clubId') clubId: string) {
    return this.rankingsService.recalculateForClub(clubId);
  }
}

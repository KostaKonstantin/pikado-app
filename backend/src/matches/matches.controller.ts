import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Patch(':id/score')
  updateScore(
    @Param('id') id: string,
    @Body() body: { player1Score: number; player2Score: number },
  ) {
    return this.matchesService.updateScore(id, body.player1Score, body.player2Score);
  }

  @Post(':id/complete')
  completeMatch(@Param('id') id: string, @Body('winnerId') winnerId: string) {
    return this.matchesService.completeMatch(id, winnerId);
  }

  @Post(':id/reset')
  resetMatch(@Param('id') id: string) {
    return this.matchesService.resetMatch(id);
  }
}

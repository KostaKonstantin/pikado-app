import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  /**
   * POST /api/share/generate
   * Authenticated — generates (or returns existing) share token for a league.
   */
  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generate(@Body() body: { leagueId: string }, @Request() req: any) {
    const token = await this.shareService.generateOrGet(body.leagueId, req.user.clubId);
    return { token };
  }

  /**
   * GET /api/share/:token
   * Public — returns standings + matches for the league linked to this token.
   */
  @Get(':token')
  async getByToken(@Param('token') token: string) {
    return this.shareService.getByToken(token);
  }
}

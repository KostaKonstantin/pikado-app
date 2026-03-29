import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubMembershipGuard } from '../common/guards/club-membership.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ClubRole } from '../common/enums';

// ── Admin controller (club-scoped) ──────────────────────────────────────────
@Controller('clubs/:clubId/invites')
@UseGuards(JwtAuthGuard, ClubMembershipGuard, RolesGuard)
@Roles(ClubRole.CLUB_ADMIN)
export class ClubInvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  create(@Param('clubId') clubId: string, @Body() body: { email: string }) {
    return this.invitesService.create(clubId, body.email);
  }

  @Get()
  findAll(@Param('clubId') clubId: string) {
    return this.invitesService.findAll(clubId);
  }

  @Delete(':inviteId')
  cancel(@Param('clubId') clubId: string, @Param('inviteId') inviteId: string) {
    return this.invitesService.cancel(clubId, inviteId);
  }

  @Patch(':inviteId/resend')
  resend(@Param('clubId') clubId: string, @Param('inviteId') inviteId: string) {
    return this.invitesService.resend(clubId, inviteId);
  }
}

// ── Public controller (no auth required) ─────────────────────────────────────
@Controller('invites')
export class PublicInvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get(':token')
  findByToken(@Param('token') token: string) {
    return this.invitesService.findByToken(token);
  }

  @Post(':token/accept')
  accept(
    @Param('token') token: string,
    @Body() body: { password?: string },
    @Req() req: any,
  ) {
    // If user is authenticated, pass their userId; otherwise anonymous
    const userId = req.user?.sub;
    return this.invitesService.accept(token, { password: body.password, userId });
  }
}

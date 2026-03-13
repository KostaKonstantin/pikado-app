import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubMembershipGuard } from '../common/guards/club-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClubRole } from '../common/enums';

@Controller('clubs')
@UseGuards(JwtAuthGuard, ClubMembershipGuard, RolesGuard)
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get(':clubId')
  findOne(@Param('clubId') clubId: string) {
    return this.clubsService.findById(clubId);
  }

  @Patch(':clubId')
  @Roles(ClubRole.CLUB_ADMIN)
  update(@Param('clubId') clubId: string, @Body() body: any) {
    return this.clubsService.update(clubId, body);
  }

  @Get(':clubId/members')
  getMembers(@Param('clubId') clubId: string) {
    return this.clubsService.getMembers(clubId);
  }

  @Delete(':clubId/members/:userId')
  @Roles(ClubRole.CLUB_ADMIN)
  removeMember(@Param('clubId') clubId: string, @Param('userId') userId: string) {
    return this.clubsService.removeMember(clubId, userId);
  }
}

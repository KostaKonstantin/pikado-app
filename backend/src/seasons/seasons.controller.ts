import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubMembershipGuard } from '../common/guards/club-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClubRole } from '../common/enums';

@Controller('clubs/:clubId/seasons')
@UseGuards(JwtAuthGuard, ClubMembershipGuard, RolesGuard)
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get()
  findAll(@Param('clubId') clubId: string) {
    return this.seasonsService.findAll(clubId);
  }

  @Get(':id')
  findOne(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.seasonsService.findOne(clubId, id);
  }

  @Post()
  @Roles(ClubRole.CLUB_ADMIN)
  create(@Param('clubId') clubId: string, @Body() body: any) {
    return this.seasonsService.create(clubId, body);
  }

  @Patch(':id')
  @Roles(ClubRole.CLUB_ADMIN)
  update(@Param('clubId') clubId: string, @Param('id') id: string, @Body() body: any) {
    return this.seasonsService.update(clubId, id, body);
  }

  @Post(':id/activate')
  @Roles(ClubRole.CLUB_ADMIN)
  activate(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.seasonsService.setActive(clubId, id);
  }
}

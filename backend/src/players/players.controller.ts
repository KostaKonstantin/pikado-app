import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubMembershipGuard } from '../common/guards/club-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClubRole } from '../common/enums';

@Controller('clubs/:clubId/players')
@UseGuards(JwtAuthGuard, ClubMembershipGuard, RolesGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  findAll(@Param('clubId') clubId: string, @Query('search') search?: string) {
    return this.playersService.findAll(clubId, search);
  }

  @Get(':id')
  findOne(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.playersService.findOne(clubId, id);
  }

  @Get(':id/stats')
  getStats(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.playersService.getStats(clubId, id);
  }

  @Get(':id/history')
  getHistory(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.playersService.getHistory(clubId, id);
  }

  @Post()
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  create(@Param('clubId') clubId: string, @Body() dto: CreatePlayerDto) {
    return this.playersService.create(clubId, dto);
  }

  @Patch(':id')
  @Roles(ClubRole.CLUB_ADMIN, ClubRole.ORGANIZER)
  update(@Param('clubId') clubId: string, @Param('id') id: string, @Body() dto: Partial<CreatePlayerDto>) {
    return this.playersService.update(clubId, id, dto);
  }

  @Delete(':id')
  @Roles(ClubRole.CLUB_ADMIN)
  remove(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.playersService.remove(clubId, id);
  }
}

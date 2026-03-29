import {
  Controller, Get, Patch, Post, Delete,
  Param, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ClubsService } from './clubs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubMembershipGuard } from '../common/guards/club-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClubRole } from '../common/enums';

const LOGO_STORAGE = diskStorage({
  destination: (_req, _file, cb) => cb(null, join(process.cwd(), 'uploads', 'logos')),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const LOGO_FILTER = (_req: any, file: any, cb: any) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
  if (!allowed.includes(extname(file.originalname).toLowerCase())) {
    return cb(new BadRequestException('Dozvoljeni formati: jpg, jpeg, png, svg, webp'), false);
  }
  cb(null, true);
};

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

  @Post(':clubId/logo')
  @Roles(ClubRole.CLUB_ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: LOGO_STORAGE,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: LOGO_FILTER,
  }))
  uploadLogo(@Param('clubId') clubId: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Fajl nije priložen');
    return this.clubsService.update(clubId, { logoUrl: `/uploads/logos/${file.filename}` });
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

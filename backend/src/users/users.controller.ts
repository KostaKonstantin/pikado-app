import {
  Controller, Patch, Post, Body, UseGuards, Request,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const AVATAR_STORAGE = diskStorage({
  destination: (_req, _file, cb) => cb(null, join(process.cwd(), 'uploads', 'avatars')),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const IMAGE_FILTER = (_req: any, file: any, cb: any) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  if (!allowed.includes(extname(file.originalname).toLowerCase())) {
    return cb(new BadRequestException('Dozvoljeni formati: jpg, jpeg, png, webp'), false);
  }
  cb(null, true);
};

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  updateProfile(@Request() req: any, @Body() body: { fullName?: string }) {
    return this.usersService.updateProfile(req.user.sub, body);
  }

  @Patch('me/password')
  changePassword(
    @Request() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('Sva polja su obavezna');
    }
    return this.usersService.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: AVATAR_STORAGE,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: IMAGE_FILTER,
  }))
  uploadAvatar(@Request() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Fajl nije priložen');
    return this.usersService.updateAvatar(req.user.sub, `/uploads/avatars/${file.filename}`);
  }
}

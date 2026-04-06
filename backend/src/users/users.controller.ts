import {
  Controller, Patch, Post, Body, UseGuards, Request,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const AVATAR_STORAGE = new CloudinaryStorage({
  cloudinary: (() => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return cloudinary;
  })(),
  params: {
    folder: 'pikado/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  } as any,
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
    return this.usersService.updateAvatar(req.user.sub, file.path);
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  // Ensure upload directories exist before starting
  const uploadsRoot = join(process.cwd(), 'uploads');
  fs.mkdirSync(join(uploadsRoot, 'logos'), { recursive: true });
  fs.mkdirSync(join(uploadsRoot, 'avatars'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve uploaded files as static assets at /uploads/*
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads' });

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3002',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🎯 Pikado API running on http://localhost:${port}`);
}

bootstrap();

import 'reflect-metadata';
import 'dotenv/config'; // apps/api/.env 로드 (Google 자격증명 등)
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule);

  // 모든 API는 /api 프리픽스 아래에 둔다.
  app.setGlobalPrefix('api');

  // DTO 자동 검증 + 화이트리스트(정의되지 않은 필드 제거).
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // 개발용 CORS — Vite 개발 서버(5173)를 허용한다.
  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/],
  });

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  Logger.log(`Slot API ready at http://localhost:${port}/api`, 'Bootstrap');
};

bootstrap();

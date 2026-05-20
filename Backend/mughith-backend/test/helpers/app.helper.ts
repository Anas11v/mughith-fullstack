import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

export interface TestAppHandle {
  app: INestApplication;
  prisma: PrismaService;
  baseUrl: string | null;
}

export async function createTestApp(
  options: { listen?: boolean } = {},
): Promise<TestAppHandle> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  let baseUrl: string | null = null;
  if (options.listen) {
    await app.listen(0);
    const server = app.getHttpServer();
    const addr = server.address();
    if (addr && typeof addr === 'object') {
      baseUrl = `http://localhost:${addr.port}`;
    }
  } else {
    await app.init();
  }

  const prisma = app.get(PrismaService);
  return { app, prisma, baseUrl };
}

export async function resetDatabase(
  prisma?: PrismaService,
): Promise<void> {
  if (!prisma) {
    return;
  }

  await prisma.notification.deleteMany();
  await prisma.case.deleteMany();
  await prisma.user.deleteMany();
}

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CaseStatus, Role, Severity, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../src/prisma/prisma.service';

export async function createUser(
  prisma: PrismaService,
  jwtService: JwtService,
  overrides: Partial<{
    email: string;
    role: Role;
    name: string;
    isVerified: boolean;
    isAvailable: boolean;
    isBusy: boolean;
    latitude: number | null;
    longitude: number | null;
    fcmToken: string | null;
  }> = {},
): Promise<{ user: User; token: string }> {
  const email =
    overrides.email ?? `user-${Math.random().toString(36).slice(2, 10)}@x.com`;
  const user = await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash('Pass1234', 10),
      name: overrides.name ?? 'Test User',
      role: overrides.role ?? Role.DONATOR,
      isVerified: overrides.isVerified ?? false,
      isAvailable: overrides.isAvailable ?? false,
      isBusy: overrides.isBusy ?? false,
      latitude: overrides.latitude ?? null,
      longitude: overrides.longitude ?? null,
      fcmToken: overrides.fcmToken ?? null,
    },
  });
  const token = jwtService.sign({ sub: user.id, role: user.role });
  return { user, token };
}

export async function createCase(
  prisma: PrismaService,
  createdById: string,
  overrides: Partial<{
    address: string;
    latitude: number;
    longitude: number;
    severity: Severity;
    status: CaseStatus;
    radiusKm: number;
    expiresAt: Date | null;
    assignedToId: string | null;
  }> = {},
) {
  return prisma.case.create({
    data: {
      address: overrides.address ?? 'Test Address',
      latitude: overrides.latitude ?? 24.7136,
      longitude: overrides.longitude ?? 46.6753,
      severity: overrides.severity ?? Severity.HIGH,
      status: overrides.status ?? CaseStatus.OPEN,
      radiusKm: overrides.radiusKm ?? 5,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000),
      createdById,
      assignedToId: overrides.assignedToId ?? null,
    },
  });
}

export function getJwt(app: INestApplication): JwtService {
  return app.get(JwtService);
}

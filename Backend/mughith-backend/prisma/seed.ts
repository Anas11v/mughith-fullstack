import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface SeedUser {
  email: string;
  name: string;
  phone: string;
  role: Role;
  isVerified: boolean;
  isAvailable: boolean;
  latitude?: number;
  longitude?: number;
  certification?: string;
  certExpiry?: Date;
}

const MAKKAH_LAT = 21.4225;
const MAKKAH_LNG = 39.8262;

const users: SeedUser[] = [
  {
    email: 'admin@mughith.sa',
    name: 'System Admin',
    phone: '+966500000001',
    role: Role.ADMIN,
    isVerified: true,
    isAvailable: false,
  },
  {
    email: 'dispatcher@mughith.sa',
    name: 'Ahmed Operator',
    phone: '+966500000002',
    role: Role.DISPATCHER,
    isVerified: true,
    isAvailable: false,
    latitude: MAKKAH_LAT,
    longitude: MAKKAH_LNG,
  },
  {
    email: 'donator@mughith.sa',
    name: 'Khalid Volunteer',
    phone: '+966500000003',
    role: Role.DONATOR,
    isVerified: true,
    isAvailable: true,
    certification: 'BLS',
    certExpiry: new Date('2027-12-31'),
    latitude: MAKKAH_LAT + 0.005,
    longitude: MAKKAH_LNG + 0.008,
  },
  {
    email: 'donator2@mughith.sa',
    name: 'Saad Volunteer',
    phone: '+966500000004',
    role: Role.DONATOR,
    isVerified: true,
    isAvailable: true,
    certification: 'ACLS',
    certExpiry: new Date('2027-06-30'),
    latitude: MAKKAH_LAT - 0.004,
    longitude: MAKKAH_LNG + 0.006,
  },
  {
    email: 'donator3@mughith.sa',
    name: 'Omar Trainee',
    phone: '+966500000005',
    role: Role.DONATOR,
    isVerified: false,
    isAvailable: false,
    latitude: MAKKAH_LAT + 0.003,
    longitude: MAKKAH_LNG - 0.007,
  },
  {
    email: 'crew@mughith.sa',
    name: 'Alpha Crew',
    phone: '+966500000006',
    role: Role.AMBULANCE_CREW,
    isVerified: true,
    isAvailable: true,
    latitude: MAKKAH_LAT - 0.006,
    longitude: MAKKAH_LNG - 0.003,
  },
];

async function main() {
  const password = await bcrypt.hash('Pass1234', 10);

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password,
        name: u.name,
        phone: u.phone,
        role: u.role,
        isVerified: u.isVerified,
        isAvailable: u.isAvailable,
        latitude: u.latitude ?? null,
        longitude: u.longitude ?? null,
        certification: u.certification ?? null,
        certExpiry: u.certExpiry ?? null,
      },
      create: {
        email: u.email,
        password,
        name: u.name,
        phone: u.phone,
        role: u.role,
        isVerified: u.isVerified,
        isAvailable: u.isAvailable,
        latitude: u.latitude ?? null,
        longitude: u.longitude ?? null,
        certification: u.certification ?? null,
        certExpiry: u.certExpiry ?? null,
      },
    });
  }

  console.log(`Seeded ${users.length} users. Password for all: Pass1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Register
  // ─────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    // 1. Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    // 2. Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // 3. Create user — role fixed to VOLUNTEER
    const user = await this.prisma.user.create({
      data: {
        email:    dto.email,
        password: hashedPassword,
        name:     dto.name,
        phone:    dto.phone ?? null,
        role:     'DONATOR',
      },
    });

    // 4. Generate JWT
    const accessToken = this.jwtService.sign({
      sub:  user.id,
      role: user.role,
    });

    // 5. Return user without password
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken };
  }

  // ─────────────────────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    // 1. Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // 2. Verify password with bcrypt
    const isPasswordValid =
      user && (await bcrypt.compare(dto.password, user.password));

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Generate JWT
    const accessToken = this.jwtService.sign({
      sub:  user.id,
      role: user.role,
    });

    // 4. Return user without password
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken };
  }

  // ─────────────────────────────────────────────────────────────
  // Get Profile
  // ─────────────────────────────────────────────────────────────
  async getProfile(userId: string) {
    // 1. Fetch user by ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

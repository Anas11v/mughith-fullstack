import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import {
  PaginatedResponse,
  buildPaginated,
} from '../../common/dto/paginated-response.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

type SafeUser = Omit<User, 'password'>;

interface ListDonatorsOptions {
  page: number;
  limit: number;
  available?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.excludePassword(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    await this.ensureUserExists(userId);

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.certification !== undefined) data.certification = dto.certification;
    if (dto.certExpiry !== undefined) data.certExpiry = new Date(dto.certExpiry);
    if (dto.fcmToken !== undefined) data.fcmToken = dto.fcmToken;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.excludePassword(updatedUser);
  }

  async toggleAvailability(
    userId: string,
    isAvailable: boolean,
  ): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.DONATOR) {
      throw new BadRequestException('Only donators can toggle availability');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isAvailable },
    });

    return this.excludePassword(updatedUser);
  }

  async verifyDonator(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.DONATOR) {
      throw new BadRequestException('User is not a donator');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    return this.excludePassword(updatedUser);
  }

  async findDonators(
    options: ListDonatorsOptions,
  ): Promise<PaginatedResponse<SafeUser>> {
    const { page, limit, available } = options;
    const where = {
      role: Role.DONATOR,
      ...(available === undefined ? {} : { isAvailable: available }),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const safeUsers = users.map((user) => this.excludePassword(user));
    return buildPaginated(safeUsers, total, page, limit);
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private excludePassword(user: User): SafeUser {
    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

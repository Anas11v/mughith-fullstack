import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListDonatorsQueryDto } from './dto/list-donators-query.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token missing or invalid' })
  getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token missing or invalid' })
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('availability')
  @UseGuards(RolesGuard)
  @Roles('DONATOR')
  @ApiOperation({ summary: 'Toggle donator availability status' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token missing, invalid, or forbidden' })
  toggleAvailability(
    @CurrentUser('sub') userId: string,
    @Body() dto: ToggleAvailabilityDto,
  ) {
    return this.usersService.toggleAvailability(userId, dto.isAvailable);
  }

  @Patch(':id/verify')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Verify a donator account' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token missing, invalid, or forbidden' })
  verifyDonator(@Param('id') userId: string) {
    return this.usersService.verifyDonator(userId);
  }

  @Get('donators')
  @UseGuards(RolesGuard)
  @Roles('DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'List donators (paginated)' })
  @ApiOkResponse({ description: 'Paginated donators returned' })
  @ApiUnauthorizedResponse({ description: 'Token missing, invalid, or forbidden' })
  findDonators(@Query() query: ListDonatorsQueryDto) {
    return this.usersService.findDonators({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      available: query.available,
    });
  }
}

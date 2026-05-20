import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CasesService } from './cases.service';
import { AmbulanceInfoDto } from './dto/ambulance-info.dto';
import { CloseCaseDto } from './dto/close-case.dto';
import { CreateCaseDto } from './dto/create-case.dto';
import { ListCasesQueryDto } from './dto/list-cases-query.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('Cases')
@ApiBearerAuth()
@Controller('cases')
@UseGuards(JwtGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Create a priority case' })
  @ApiCreatedResponse({ description: 'Case created' })
  @ApiBadRequestResponse({ description: 'Address could not be geocoded' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCaseDto,
  ) {
    return this.casesService.create(userId, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'List cases (paginated)' })
  findAll(@Query() query: ListCasesQueryDto) {
    return this.casesService.findAll(query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Case history for current user' })
  getHistory(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.casesService.getHistory(userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single case by id' })
  @ApiOkResponse({ description: 'Case returned' })
  @ApiNotFoundResponse({ description: 'Case not found' })
  findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('DISPATCHER', 'DONATOR', 'AMBULANCE_CREW', 'ADMIN')
  @ApiOperation({ summary: 'Update case status' })
  @ApiBadRequestResponse({ description: 'Illegal status transition' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.casesService.updateStatus(id, dto.status);
  }

  @Patch(':id/close')
  @UseGuards(RolesGuard)
  @Roles('DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Close case with outcome report' })
  close(@Param('id') id: string, @Body() dto: CloseCaseDto) {
    return this.casesService.close(id, dto);
  }

  @Patch(':id/ambulance-info')
  @UseGuards(RolesGuard)
  @Roles('DISPATCHER', 'AMBULANCE_CREW', 'ADMIN')
  @ApiOperation({ summary: 'Update ambulance info on a case' })
  updateAmbulanceInfo(
    @Param('id') id: string,
    @Body() dto: AmbulanceInfoDto,
  ) {
    return this.casesService.updateAmbulanceInfo(id, dto);
  }

  @Patch(':id/panic')
  @UseGuards(RolesGuard)
  @Roles('AMBULANCE_CREW')
  @ApiOperation({ summary: 'Trigger traffic panic (ambulance crew only)' })
  panic(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.casesService.triggerPanic(id, userId);
  }
}

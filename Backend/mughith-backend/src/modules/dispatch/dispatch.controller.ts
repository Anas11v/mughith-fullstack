import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DispatchService } from './dispatch.service';

@ApiTags('Dispatch')
@ApiBearerAuth()
@Controller('dispatch')
@UseGuards(JwtGuard)
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post(':caseId/accept')
  @UseGuards(RolesGuard)
  @Roles('DONATOR')
  @ApiOperation({ summary: 'Accept a case (first-to-claim wins)' })
  @ApiConflictResponse({ description: 'Case already claimed' })
  accept(
    @Param('caseId') caseId: string,
    @CurrentUser('sub') donatorId: string,
  ) {
    return this.dispatchService.acceptCase(caseId, donatorId);
  }

  @Post(':caseId/reject')
  @UseGuards(RolesGuard)
  @Roles('DONATOR')
  @ApiOperation({ summary: 'Reject a case alert' })
  reject(
    @Param('caseId') caseId: string,
    @CurrentUser('sub') donatorId: string,
  ) {
    return this.dispatchService.rejectCase(caseId, donatorId);
  }

  @Get(':caseId/nearby')
  @UseGuards(RolesGuard)
  @Roles('DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'List nearby donators for a case' })
  @ApiOkResponse({ description: 'Ranked nearby donators' })
  nearby(@Param('caseId') caseId: string) {
    return this.dispatchService.getNearbyDonators(caseId);
  }
}

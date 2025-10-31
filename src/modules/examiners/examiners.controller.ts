import {
  Controller,
  Get,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffService } from '../staffs/staffs.service';

@ApiTags('Examiners')
@ApiBearerAuth()
@Controller('api/examiners')
export class ExaminersController {
  constructor(private readonly staffService: StaffService) {}

  @Get('schedules')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get schedules for the authenticated examiner',
    description: 'Examiner can view their own assigned schedules',
  })
  async getMySchedules(@Request() req: any) {
    try {
      const examinerId = req.user.sub || req.user.userId;
      return await this.staffService.getSchedulesByExaminer(examinerId);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to get schedules');
    }
  }
}

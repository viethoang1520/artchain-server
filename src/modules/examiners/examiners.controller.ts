import {
  Controller,
  Get,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExaminersService } from './examiners.service';

@ApiTags('Examiners')
@ApiBearerAuth()
@Controller('api/examiners')
export class ExaminersController {
  constructor(private readonly examinersService: ExaminersService) {}

  @Get('schedules')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get schedules for the authenticated examiner',
    description: 'Examiner can view their own assigned schedules',
  })
  async getMySchedules(@Request() req: any) {
    try {
      const examinerId = req.user.sub || req.user.userId;
      return await this.examinersService.getSchedulesByExaminer(examinerId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể lấy lịch trình của giám khảo';
      throw new BadRequestException(message);
    }
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ContestsService } from './contests.service';

import { GetContestDto } from './dto/get-contest.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/contests')

export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Get()
  findByParams(@Query() param: GetContestDto) {
    return this.contestsService.findByQuery(param);
  }
    
}

import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ContestsService } from './contests.service';
import { GetContestDto } from './dto/get-contest.dto';

@Controller('api/contests')
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Get()
  findAll(@Query() query: GetContestDto) {
    return this.contestsService.findAll(query);
  }

  @Get('examiner/:examinerId')
  findAllForExaminer(@Param('examinerId', ParseIntPipe) examinerId: number) {
    return this.contestsService.findAllForExaminer(examinerId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contestsService.findOne(id);
  }
}

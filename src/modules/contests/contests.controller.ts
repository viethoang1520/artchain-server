import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards
} from '@nestjs/common';
import { ContestsService } from './contests.service';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { GetContestDto } from './dto/get-contest.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/contests')
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query() query: GetContestDto) {
    return this.contestsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contestsService.findOne(id);
  }
}

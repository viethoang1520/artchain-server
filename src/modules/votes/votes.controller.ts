import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VotesService } from './votes.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Votes')
@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}


}

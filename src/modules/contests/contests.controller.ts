import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ContestsService } from './contests.service';
import { ContestResponseDto } from './dto/contest-response.dto';

@Controller('api/contests')
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Get()
  async findAll(): Promise<ContestResponseDto[]> {
    return this.contestsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ContestResponseDto> {
    try {
      return await this.contestsService.findOne(+id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(
        `Contest with ID ${id} not found or an error occurred`,
      );
    }
  }
}

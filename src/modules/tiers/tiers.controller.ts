import { Controller, Get } from '@nestjs/common';
import { TiersService } from './tiers.service';

@Controller('api/tiers')
export class TiersController {
  constructor(private readonly tiersService: TiersService) { }

  @Get()
  findAll() {
    return this.tiersService.findAll();
  }
}

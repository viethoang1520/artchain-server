import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ProfileService } from './profiles.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}
}

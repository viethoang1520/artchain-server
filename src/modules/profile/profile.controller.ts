import { Controller, Get, Param } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileResponseDto } from '../users/dto/profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(':id')
  async getProfile(@Param('id') id: number): Promise<ProfileResponseDto> {
    return await this.profileService.getProfile(id);
  }
}

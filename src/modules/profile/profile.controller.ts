import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileResponseDto } from '../users/dto/profile.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(AuthGuard)
  @Get(':id')
  async getProfile(@Param('id') id: number): Promise<ProfileResponseDto> {
    return await this.profileService.getProfile(id);
  }
}

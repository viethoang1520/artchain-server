import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ProfileService } from './profiles.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // @UseGuards(AuthGuard)
  // @Get(':id')
  // async getProfile(@Param('id') id: string): Promise<ProfileResponseDto> {
  //   return await this.profileService.getProfile(id);
  // }
}

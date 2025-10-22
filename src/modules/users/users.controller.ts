import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('api/users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req: any): any {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return { message: 'User ID not found in request' };
      }
      return this.usersService.me(userId);
    } catch (error) {
      return { message: 'Error occurred while fetching user information' };
    }
  }

  @Get('me/submissions')
  @UseGuards(AuthGuard)
  submissions(@Req() req: any): any {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return { message: 'User ID not found in request' };
      }
      return this.usersService.submissions(userId);
    } catch (error) {
      return { message: 'Error occurred while fetching user submissions' };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    try {
      return this.usersService.me(id);
    } catch (error) {
      return { message: 'Error occurred while fetching user information' };
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}

import {
  Controller,
  Get,
  Body,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetSubmissionsDto } from './dto/get-submissions.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

@Controller('api/users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Get(':userId/achievements')
  @ApiOperation({
    summary: 'Xem thành tựu/giải thưởng của user (Public API)',
    description: `
API xem tất cả các giải thưởng/thành tựu mà user đã đạt được.
    `,
  })
  @ApiParam({
    name: 'userId',
    description: 'ID của user cần xem thành tựu',
    example: 'ba9b73f4-bdfd-4374-b289-5c1fcff701fe',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thành tựu thành công',
    schema: {
      example: {
        success: true,
        data: {
          user: {
            userId: 'ba9b73f4-bdfd-4374-b289-5c1fcff701fe',
            fullName: 'Nguyễn Văn A',
          },
          achievements: [
            {
              paintingId: 'painting-uuid-1',
              paintingTitle: 'Bức tranh mùa xuân',
              paintingImage: 'https://firebase.com/image1.jpg',
              award: {
                awardId: 1,
                name: 'Giải Nhất',
                description: 'Giải thưởng cao nhất',
                rank: 1,
                prize: 5000000,
              },
              contest: {
                contestId: 1,
                title: 'Art Competition 2025',
                startDate: '2025-10-15',
                endDate: '2025-11-15',
              },
              achievedDate: '2025-11-15T10:30:00Z',
            },
          ],
          totalAchievements: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getAchievements(@Param('userId') userId: string) {
    return this.usersService.getAchievements(userId);
  }
}

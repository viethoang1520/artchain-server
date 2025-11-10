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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { VotesService } from './votes.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { VoteForAwardDto } from './dto/vote-for-award.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Votes')
@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Get('contest/:contestId/awards')
  @ApiOperation({
    summary: 'Lấy danh sách các giải có thể vote trong contest',
    description:
      'Hiển thị danh sách các giải thưởng (không bao gồm giải Nhất, Nhì, Ba) mà user có thể vote. ' +
      'Khi user click vào một giải, sẽ gọi API khác để xem danh sách tranh Round 2 cho giải đó.',
  })
  @ApiParam({
    name: 'contestId',
    description: 'ID của contest',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'List of votable awards',
    schema: {
      example: {
        success: true,
        data: {
          contestId: 1,
          contestTitle: 'Summer Art Contest 2025',
          awards: [
            {
              awardId: 4,
              name: 'Giải Sáng Tạo',
              description: 'Dành cho tác phẩm có tính sáng tạo cao',
              rank: 4,
              prize: 500000,
              quantity: 2,
              totalVotes: 45,
            },
            {
              awardId: 5,
              name: 'Giải Ý Nghĩa',
              description: 'Dành cho tác phẩm có ý nghĩa sâu sắc',
              rank: 5,
              prize: 500000,
              quantity: 2,
              totalVotes: 38,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  async getVotableAwards(@Param('contestId', ParseIntPipe) contestId: number) {
    return this.votesService.getVotableAwards(contestId);
  }

  @Get('contest/:contestId/award/:awardId/paintings')
  @ApiOperation({
    summary: 'Lấy danh sách tranh Round 2 có thể vote cho một giải cụ thể',
  })
  @ApiParam({
    name: 'contestId',
    description: 'ID của contest',
    example: 1,
  })
  @ApiParam({
    name: 'awardId',
    description: 'ID của giải thưởng',
    example: 4,
  })
  @ApiQuery({
    name: 'accountId',
    description: 'ID của user (để check đã vote chưa)',
    required: false,
    example: 'ba9b73f4-bdfd-4374-b289-5c1fcff701fe',
  })
  @ApiResponse({
    status: 200,
    description: 'List of Round 2 paintings for the award',
    schema: {
      example: {
        success: true,
        data: {
          award: {
            awardId: 4,
            name: 'Giải Sáng Tạo',
            description: 'Dành cho tác phẩm có tính sáng tạo cao',
            rank: 4,
            prize: 500000,
            quantity: 2,
          },
          paintings: [
            {
              paintingId: '123e4567-e89b-12d3-a456-426614174000',
              title: 'Beautiful Sunset - Round 2',
              description: 'A painting of sunset',
              imageUrl: 'https://example.com/image.jpg',
              competitorId: 'ba9b73f4-bdfd-4374-b289-5c1fcff701fe',
              submissionDate: '2025-01-10T10:00:00.000Z',
              voteCount: 12,
              hasVoted: false,
            },
            {
              paintingId: '987e6543-e21b-34c5-b678-426614174001',
              title: 'Mountain View - Round 2',
              description: 'A mountain landscape',
              imageUrl: 'https://example.com/image2.jpg',
              competitorId: 'ca9b73f4-bdfd-4374-b289-5c1fcff701ff',
              submissionDate: '2025-01-11T10:00:00.000Z',
              voteCount: 8,
              hasVoted: true,
            },
          ],
          statistics: {
            totalEligiblePaintings: 15,
            totalVotesForThisAward: 45,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contest or Award not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot vote for top 3 awards or Round 2 not found',
  })
  async getPaintingsForAward(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Param('awardId', ParseIntPipe) awardId: number,
    @Query('accountId') accountId?: string,
  ) {
    return this.votesService.getPaintingsForAward(
      contestId,
      awardId,
      accountId,
    );
  }

  @Post('submit')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Vote cho một bức tranh Round 2 trong một giải cụ thể',
    description:
      'User vote cho một bức tranh Round 2 trong một giải thưởng cụ thể. ' +
      'Chỉ có thể vote cho paintings của Round 2 (đã được auto tạo record và upload ảnh). ' +
      'Mỗi user chỉ có thể vote 1 lần cho mỗi bức tranh trong mỗi giải.',
  })
  @ApiBody({
    type: VoteForAwardDto,
    description: 'Thông tin vote',
    examples: {
      example1: {
        summary: 'Vote cho Giải Sáng Tạo',
        value: {
          accountId: 'ba9b73f4-bdfd-4374-b289-5c1fcff701fe',
          paintingId: '123e4567-e89b-12d3-a456-426614174000',
          awardId: 4,
          contestId: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Vote submitted successfully',
    schema: {
      example: {
        success: true,
        message: 'Vote submitted successfully',
        data: {
          voteId: 1,
          painting: {
            paintingId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Beautiful Sunset - Round 2',
          },
          award: {
            awardId: 4,
            name: 'Giải Sáng Tạo',
          },
          currentVoteCount: 13,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Painting or Award not found',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid vote (painting not from Round 2, award is top 3, etc.)',
  })
  @ApiResponse({
    status: 409,
    description:
      'You have already voted for this painting in this award category',
  })
  async voteForAward(@Body() body: VoteForAwardDto) {
    const { accountId, paintingId, awardId, contestId } = body;
    return this.votesService.voteForAward(
      accountId,
      paintingId,
      awardId,
      contestId,
    );
  }

  @Delete('remove')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xóa vote của user cho một bức tranh Round 2 trong một giải',
    description: 'User có thể thay đổi quyết định và xóa vote của mình',
  })
  @ApiBody({
    type: VoteForAwardDto,
    description: 'Thông tin vote cần xóa',
    examples: {
      example1: {
        summary: 'Xóa vote cho Giải Sáng Tạo',
        value: {
          accountId: 'ba9b73f4-bdfd-4374-b289-5c1fcff701fe',
          paintingId: '123e4567-e89b-12d3-a456-426614174000',
          awardId: 4,
          contestId: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Vote removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Vote removed successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Vote not found',
  })
  async removeVoteForAward(@Body() body: VoteForAwardDto) {
    const { accountId, paintingId, awardId, contestId } = body;
    return this.votesService.removeVoteForAward(
      accountId,
      paintingId,
      awardId,
      contestId,
    );
  }
}

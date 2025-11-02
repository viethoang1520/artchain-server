import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { PaintingsService } from './paintings.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseService } from '../firebase/firebase.service';
import { memoryStorage } from 'multer';
import { UploadPaintingDto } from './dto/upload-painting.dto';
import { EvaluatePaintingDto } from './dto/evaluate-painting.dto';
import { EvaluateRound2Dto } from './dto/evaluate-round2.dto';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PreliminaryEvaluationDto } from './dto/preliminary-evaluation.dto';
import { PreliminaryReviewDto } from './dto/preliminary-review.dto';
import { UUID } from 'crypto';

@Controller('api/paintings')
@ApiTags('Paintings')
export class PaintingsController {
  constructor(private readonly paintingsService: PaintingsService) {}

  @Get('')
  @ApiOperation({
    summary: 'Lấy tất cả các tranh theo id cuộc thi và tên vòng thi',
  })
  @ApiQuery({
    name: 'contestId',
    description: 'ID của cuộc thi',
    example: 1,
  })
  @ApiQuery({
    name: 'roundName',
    description: 'Tên vòng thi (tùy chọn). Ví dụ: ROUND_1, ROUND_2',
    example: 'ROUND_1',
    required: false,
  })
  // @ApiQuery({
  //   name: 'is_passed',
  //   description:
  //     'Lọc theo trạng thái đỗ/rớt (tùy chọn). true = đỗ, false = rớt, null = chưa chấm',
  //   example: true,
  //   required: false,
  //   enum: ['true', 'false', 'null'],
  // })
  @ApiQuery({
    name: 'status',
    description:
      'Lọc theo trạng thái painting (tùy chọn). Ví dụ: PENDING, ACCEPTED, REJECTED',
    example: 'PENDING',
    required: false,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
  })
  @ApiQuery({
    name: 'examinerId',
    description: 'ID của giám khảo (tùy chọn)',
    example: 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
    required: false,
  })
  async getPaintingsByContestId(
    @Query('contestId') contestId: number,
    @Query('roundName') roundName?: string,
    // @Query('is_passed') isPassed?: string,
    @Query('status') status?: string,
    @Query('examinerId') examinerId?: string,
  ) {
    // let isPassedValue: boolean | null = null;

    // if (isPassed !== undefined) {
    //   if (isPassed === 'null') {
    //     isPassedValue = null;
    //   } else if (isPassed === 'true') {
    //     isPassedValue = true;
    //   } else if (isPassed === 'false') {
    //     isPassedValue = false;
    //   }
    // }

    try {
      return await this.paintingsService.getPaintingsByContestId(
        contestId,
        roundName,
        // isPassedValue,
        status,
        examinerId,
      );
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to get paintings');
    }
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload tranh vẽ với thông tin' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File hình ảnh tranh vẽ',
        },
        competitorId: {
          type: 'string',
          description: 'ID của thí sinh',
          example: 'ba9b73f4-bdfd-4374-b289-5c1fcff701fe',
        },
        title: {
          type: 'string',
          description: 'Tiêu đề tranh',
          example: 'Chú bộ đội',
        },
        contestId: {
          type: 'integer',
          description: 'ID cuộc thi',
          example: 1,
        },
        description: {
          type: 'string',
          description: 'Mô tả tranh',
          example: 'Tranh vẽ chú bộ đội đang gác trong rừng',
        },
        roundId: {
          type: 'string',
          description: 'ID vòng thi',
          example: 'round1',
        },
      },
      required: ['file', 'competitorId', 'title', 'contestId', 'roundId'],
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: UploadPaintingDto,
  ) {
    try {
      return this.paintingsService.uploadFile(file, data);
    } catch (error) {
      throw new BadRequestException(error.message || 'File upload failed');
    }
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Đánh giá tranh (Vòng 1 hoặc chung)' })
  @ApiBody({ type: EvaluatePaintingDto })
  async evaluatePainting(@Body() evaluateDto: EvaluatePaintingDto) {
    return this.paintingsService.evaluatePainting(evaluateDto);
  }

  @Post('evaluate/round2')
  @ApiOperation({
    summary: 'Đánh giá tranh VÒNG 2',
    description: `
Chấm điểm tranh cho VÒNG 2 theo 5 tiêu chí:
- Creativity & Originality: 0-30 điểm
- Composition: 0-20 điểm  
- Color & Technique: 0-20 điểm
- Relevance to Theme: 0-20 điểm
- Overall Aesthetic: 0-10 điểm
Tổng điểm tối đa: 100 điểm (tự động tính)
    `,
  })
  @ApiBody({ type: EvaluateRound2Dto })
  async evaluateRound2Painting(@Body() evaluateDto: EvaluateRound2Dto) {
    return this.paintingsService.evaluateRound2Painting(evaluateDto);
  }

  @Post('evaluate/preliminary')
  @ApiOperation({ summary: 'Đánh giá tranh vòng sơ khảo' })
  @ApiBody({ type: PreliminaryEvaluationDto })
  async evaluatePreliminary(@Body() evaluateDto: PreliminaryEvaluationDto) {
    return this.paintingsService.evaluatePreliminary(evaluateDto);
  }

  @Get(':paintingId/evaluations')
  @ApiOperation({ summary: 'Lấy tất cả các đánh giá của một tranh' })
  @ApiParam({
    name: 'paintingId',
    description: 'ID của tranh cần xem đánh giá',
  })
  async getPaintingEvaluations(@Param('paintingId') paintingId: string) {
    return this.paintingsService.getPaintingEvaluations(paintingId);
  }

  @Post('batch/preliminary-review')
  @ApiOperation({
    summary: 'Chấm hàng loạt các bài sau vòng sơ khảo',
    description: 'Cập nhật isPassed và status cho nhiều paintings cùng lúc',
  })
  @ApiBody({ type: PreliminaryReviewDto })
  async batchPreliminaryReview(@Body() reviewDto: PreliminaryReviewDto) {
    return this.paintingsService.batchPreliminaryReview(reviewDto);
  }

  @Get('round2/rankings')
  @ApiOperation({
    summary: 'Lấy top 1 của mỗi bảng trong vòng 2',
    description:
      'Lấy top 1 tranh có điểm trung bình score_round_2 cao nhất của mỗi bảng (A, B, C, D) trong ROUND_2',
  })
  @ApiQuery({
    name: 'contestId',
    description: 'ID của cuộc thi',
    example: 1,
    required: true,
  })
  async getRound2PaintingsWithAvgScore(@Query('contestId') contestId: number) {
    return this.paintingsService.getRound2PaintingsWithAvgScore(contestId);
  }
}

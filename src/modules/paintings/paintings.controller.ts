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

@Controller('api/paintings')
@ApiTags('Paintings')
export class PaintingsController {
  constructor(private readonly paintingsService: PaintingsService) {}

  @Get('')
  @ApiOperation({ summary: 'Lấy tất cả các tranh theo id cuộc thi và round' })
  @ApiQuery({
    name: 'contestId',
    description: 'ID của cuộc thi',
    example: 1,
  })
  @ApiQuery({
    name: 'roundId',
    description: 'ID của vòng thi (tùy chọn)',
    example: 'round1',
    required: false,
  })
  async getPaintingsByContestId(
    @Query('contestId') contestId: number,
    @Query('roundId') roundId?: string,
  ) {
    try {
      return await this.paintingsService.getPaintingsByContestId(
        contestId,
        roundId,
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
  @ApiOperation({ summary: 'Đánh giá tranh' })
  @ApiBody({ type: EvaluatePaintingDto })
  async evaluatePainting(@Body() evaluateDto: EvaluatePaintingDto) {
    return this.paintingsService.evaluatePainting(evaluateDto);
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
}

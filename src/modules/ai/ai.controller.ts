import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';

type CheckValidSubmissionBody = {
  base64: string;
};

@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('check-valid')
  @UseInterceptors(FileInterceptor('submission'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        submission: {
          type: 'string',
          format: 'binary',
          description: 'Image file upload',
        },
        base64: {
          type: 'string',
          description: 'Base64-encoded image (optional if file provided)',
        },
      },
    },
  })
  async checkValidSubmission(
    @UploadedFile() file: Express.Multer.File,
    @Body() submission: CheckValidSubmissionBody,
  ) {
    const base64 = file?.buffer?.toString('base64') ?? submission?.base64;

    if (!base64) {
      throw new BadRequestException('Missing submission file or base64');
    }

    const valid = await this.aiService.checkValidSubmission(base64);

    return { valid };
  }
}

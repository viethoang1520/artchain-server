import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';

type CheckValidSubmissionBody = {
  base64: string;
};

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) { }

  @Post('check-valid')
  async checkValidSubmission(@Body() submission: CheckValidSubmissionBody) {
    const valid = await this.aiService.checkValidSubmission(submission);

    return { valid };
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async checkValidSubmission(submission: any): Promise<boolean> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an image validation system.

Check if this image is valid for submission.

Rules:
- Must be a real image (not blank, not corrupted)
- Must contain meaningful content
- No NSFW, violence, illegal content
- No pure text screenshot

Return ONLY JSON:
{
  "valid": true/false,
  "reason": "short reason"
}
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: submission.base64, // hoặc convert từ URL
        },
      },
    ]);

    const text = result.response.text();

    try {
      const parsed = JSON.parse(text);
      return parsed.valid;
    } catch (e) {
      console.error('Parse error:', text);
      return false;
    }
  }
}
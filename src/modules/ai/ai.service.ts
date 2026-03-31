import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private extractJsonObject(
    text: string,
  ): { valid: boolean; reason: string } | null {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenced?.[1] ?? text;
    const jsonMatch = candidate.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  async checkValidSubmission(base64Input: string): Promise<any> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });

      const base64 = base64Input.includes(',')
        ? base64Input.split(',').pop()
        : base64Input;

      if (!base64) {
        return false;
      }

      const prompt = `
You are an image validation system.

Check if this image is valid for submission.

Rules:
- Must be a real image (not blank, not corrupted)
- Must contain meaningful content
- No NSFW, violence, illegal content
- No pure text screenshot
- Please send reason in Vietnamese

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
            data: base64,
          },
        },
      ]);

      const text = result.response.text();
      const parsed = this.extractJsonObject(text);
      return parsed ?? { valid: false, reason: 'Invalid model response' };
    } catch (e) {
      console.error('Parse error:', e.message);
      return false;
    }
  }
}

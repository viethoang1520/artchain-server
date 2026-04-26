import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  private extractJsonObject(text: string) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  async checkValidSubmission(base64Input: string): Promise<any> {
    try {
      const base64 = base64Input.includes(',')
        ? base64Input.split(',').pop()
        : base64Input;

      if (!base64) return false;

      const prompt = `
        You are an image validation system.

        Your task is to determine whether an uploaded image is a valid HAND-DRAWN ARTWORK.

        STRICT RULES:

        1. Main requirement:
        - The image MUST be a hand-drawn artwork
        - Acceptable: pencil drawing, pen sketch, watercolor, painting, doodle, traditional art
        - The drawing can be on paper, canvas, or similar surfaces

        2. Allowed variations:
        - Photo of a hand-drawn artwork is OK (taken by camera)
        - Slight shadows, lighting variations from camera are acceptable
        - Colored or black-and-white drawings are both valid

        3. Prohibited content (REJECT):
        - Real-world photos (landscape, objects, people, buildings, food, etc.)
        - Selfies or human portraits (real humans)
        - Digital art (AI-generated, Photoshop, 3D render, vector art)
        - Screenshots (apps, games, UI, chat, code, websites)
        - Pure text images (notes, documents, printed text)
        - Blank or nearly blank images

        4. Quality requirements:
        - The drawing must be visible and clear
        - Not too blurry, too dark, or overexposed
        - The main subject must be recognizable
        - Not heavily obstructed, cropped, or distorted

        5. Low-value / invalid drawings:
        - Random scribbles with no clear subject
        - Extremely minimal marks (e.g., just a line or dot)
        - Incomplete drawing with no identifiable content

        6. Authenticity:
        - Must look like it was physically drawn by hand
        - Visible signs: strokes, pen/pencil texture, paper background
        - Reject if it looks AI-generated or digitally created

        OUTPUT FORMAT (STRICT):
        Return ONLY valid JSON:

        {
          "valid": true/false,
          "reason": "short reason in Vietnamese"
        }
      `;
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // hoặc gpt-4o
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                },
              },
            ],
          },
        ],
      });

      const text = response.choices[0]?.message?.content || '';
      const parsed = this.extractJsonObject(text);

      return parsed ?? { valid: false, reason: 'Invalid model response' };
    } catch (e: any) {
      console.error('GPT error:', e.message);
      return false;
    }
  }
}
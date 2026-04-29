import type { ValidationResult } from '../../../entities/validation/index.ts';
import { buildSystemPrompt } from '../../../shared/prompts/systemPrompt.ts';
import type { GeminiClient } from '../lib/geminiClient.ts';

export class ValidateSpecService {
  constructor(private readonly gemini: GeminiClient) {}

  async validate(text: string): Promise<ValidationResult> {
    const systemInstruction = buildSystemPrompt();
    const { text: markdown, model, durationMs } = await this.gemini.generate({
      systemInstruction,
      userText: text,
    });

    return {
      markdown,
      meta: { model, durationMs },
    };
  }
}

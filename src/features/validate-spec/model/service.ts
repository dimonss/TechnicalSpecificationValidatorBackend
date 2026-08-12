import type { ValidationResult, UsageInfo } from '../../../entities/validation/index.ts';
import { buildSystemPrompt } from '../../../shared/prompts/systemPrompt.ts';
import { QuotaExceededError } from '../../../shared/errors/AppError.ts';
import type { GeminiClient } from '../lib/geminiClient.ts';
import type { QuotaService } from './quotaService.ts';

export class ValidateSpecService {
  constructor(
    private readonly gemini: GeminiClient,
    private readonly quotaService: QuotaService,
  ) {}

  getUsage(clientKey?: string): UsageInfo {
    return this.quotaService.getUsage(clientKey);
  }

  async validate(text: string, clientKey?: string): Promise<ValidationResult> {
    const currentUsage = this.quotaService.getUsage(clientKey);
    if (currentUsage.remaining <= 0) {
      throw new QuotaExceededError('Дневной лимит запросов исчерпан');
    }

    const systemInstruction = buildSystemPrompt();
    const { text: markdown, model, durationMs } = await this.gemini.generate({
      systemInstruction,
      userText: text,
    });

    const updatedUsage = this.quotaService.consume(clientKey);

    return {
      markdown,
      meta: { model, durationMs },
      usage: updatedUsage,
    };
  }
}


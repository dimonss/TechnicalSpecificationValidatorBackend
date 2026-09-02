import type {
  ValidationResult,
  UsageInfo,
  ValidationStreamEvent,
} from '../../../entities/validation/index.ts';
import { buildSystemPrompt } from '../../../shared/prompts/systemPrompt.ts';
import { GeminiError, QuotaExceededError } from '../../../shared/errors/AppError.ts';
import type { GeminiClient } from '../lib/geminiClient.ts';
import type { QuotaService } from './quotaService.ts';

export class ValidateSpecService {
  constructor(
    private readonly gemini: GeminiClient,
    private readonly quotaService: QuotaService,
  ) {}

  getUsage(clientKey?: string, isUnlimited?: boolean): UsageInfo {
    return this.quotaService.getUsage(clientKey, isUnlimited);
  }

  async validate(
    text: string,
    clientKey?: string,
    isUnlimited?: boolean,
  ): Promise<ValidationResult> {
    const currentUsage = this.quotaService.getUsage(clientKey, isUnlimited);
    if (!isUnlimited && currentUsage.remaining <= 0) {
      throw new QuotaExceededError('Дневной лимит запросов исчерпан');
    }

    const systemInstruction = buildSystemPrompt();
    const { text: markdown, model, durationMs } = await this.gemini.generate({
      systemInstruction,
      userText: text,
    });

    const updatedUsage = this.quotaService.consume(clientKey, isUnlimited);

    return {
      markdown,
      meta: { model, durationMs },
      usage: updatedUsage,
    };
  }

  async *validateStream(
    text: string,
    clientKey?: string,
    isUnlimited?: boolean,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<ValidationStreamEvent, void, unknown> {
    const currentUsage = this.quotaService.getUsage(clientKey, isUnlimited);
    if (!isUnlimited && currentUsage.remaining <= 0) {
      throw new QuotaExceededError('Дневной лимит запросов исчерпан');
    }

    const systemInstruction = buildSystemPrompt();
    const startedAt = Date.now();
    let totalText = '';

    for await (const chunk of this.gemini.generateStream({
      systemInstruction,
      userText: text,
      abortSignal,
    })) {
      if (abortSignal?.aborted) return;
      totalText += chunk;
      yield { type: 'chunk', text: chunk };
    }

    if (abortSignal?.aborted) return;

    if (!totalText || totalText.trim().length === 0) {
      throw new GeminiError('Gemini вернул пустой ответ');
    }

    const durationMs = Date.now() - startedAt;
    const updatedUsage = this.quotaService.consume(clientKey, isUnlimited);

    yield {
      type: 'done',
      meta: {
        model: this.gemini.getModel(),
        durationMs,
      },
      usage: updatedUsage,
    };
  }
}



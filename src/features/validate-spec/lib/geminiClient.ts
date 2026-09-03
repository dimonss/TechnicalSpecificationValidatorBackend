import { GoogleGenAI } from '@google/genai';
import { GeminiError } from '../../../shared/errors/AppError.ts';

export interface GeminiGenerateParams {
  systemInstruction: string;
  userText: string;
}

export interface GeminiGenerateResult {
  text: string;
  model: string;
  durationMs: number;
}

export interface GeminiGenerateStreamParams {
  systemInstruction: string;
  userText: string;
  abortSignal?: AbortSignal;
}

function formatGeminiErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('503') || raw.toLowerCase().includes('high demand') || raw.includes('UNAVAILABLE')) {
    return 'Модель AI временно перегружена (503). Серверы испытывают пиковую нагрузку. Пожалуйста, повторите попытку через 10–30 секунд.';
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return 'Превышен лимит запросов к Gemini API (429). Попробуйте позже.';
  }
  const matches = [...raw.matchAll(/"message"\s*:\s*"([^"]+)"/g)];
  if (matches.length > 0) {
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const candidate = match?.[1]?.replace(/\\n/g, ' ').replace(/\\"/g, '"').trim();
      if (candidate && !candidate.startsWith('{') && candidate.length > 5) {
        return candidate;
      }
    }
  }
  return `Ошибка обращения к Gemini API: ${raw}`;
}

export class GeminiClient {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  getModel(): string {
    return this.model;
  }

  async generate({ systemInstruction, userText }: GeminiGenerateParams): Promise<GeminiGenerateResult> {
    const startedAt = Date.now();
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: userText,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const text = response.text;
      if (!text || text.trim().length === 0) {
        throw new GeminiError('Gemini вернул пустой ответ');
      }

      return {
        text,
        model: this.model,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (error instanceof GeminiError) throw error;
      throw new GeminiError(formatGeminiErrorMessage(error));
    }
  }

  async *generateStream({
    systemInstruction,
    userText,
    abortSignal,
  }: GeminiGenerateStreamParams): AsyncGenerator<string, void, unknown> {
    try {
      const responseStream = await this.client.models.generateContentStream({
        model: this.model,
        contents: userText,
        config: {
          systemInstruction,
          temperature: 0.3,
          abortSignal,
        },
      });

      for await (const chunk of responseStream) {
        if (abortSignal?.aborted) {
          return;
        }
        const chunkText = chunk.text;
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error) {
      if (abortSignal?.aborted) {
        return;
      }
      if (error instanceof GeminiError) throw error;
      throw new GeminiError(formatGeminiErrorMessage(error));
    }
  }
}



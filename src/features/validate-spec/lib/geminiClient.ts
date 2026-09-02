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
      const message = error instanceof Error ? error.message : String(error);
      throw new GeminiError(`Ошибка обращения к Gemini API: ${message}`);
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
      const message = error instanceof Error ? error.message : String(error);
      throw new GeminiError(`Ошибка обращения к Gemini API: ${message}`);
    }
  }
}


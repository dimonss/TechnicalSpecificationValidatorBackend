import { z } from 'zod';

export const validateRequestSchema = z.object({
  text: z
    .string()
    .min(1, 'Текст технического задания не может быть пустым')
    .max(50_000, 'Текст технического задания превышает 50 000 символов'),
});

export type ValidateRequestBody = z.infer<typeof validateRequestSchema>;

export const validateResponseSchema = z.object({
  markdown: z.string(),
  meta: z.object({
    model: z.string(),
    durationMs: z.number().int().nonnegative(),
  }),
});

export type ValidateResponseBody = z.infer<typeof validateResponseSchema>;

export const templateResponseSchema = z.object({
  markdown: z.string(),
});

export type TemplateResponseBody = z.infer<typeof templateResponseSchema>;

export const errorResponseJsonSchema = {
  type: 'object',
  required: ['error'],
  additionalProperties: false,
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      additionalProperties: false,
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

export const healthResponseJsonSchema = {
  type: 'object',
  required: ['status'],
  additionalProperties: false,
  properties: {
    status: { type: 'string', const: 'ok' },
  },
} as const;

export const templateResponseJsonSchema = {
  type: 'object',
  required: ['markdown'],
  additionalProperties: false,
  properties: {
    markdown: { type: 'string' },
  },
} as const;

export const validateRequestJsonSchema = {
  type: 'object',
  required: ['text'],
  additionalProperties: false,
  properties: {
    text: {
      type: 'string',
      minLength: 1,
      maxLength: 50_000,
      description: 'Technical specification text to validate.',
    },
  },
} as const;

export const validateResponseJsonSchema = {
  type: 'object',
  required: ['markdown', 'meta'],
  additionalProperties: false,
  properties: {
    markdown: { type: 'string' },
    meta: {
      type: 'object',
      required: ['model', 'durationMs'],
      additionalProperties: false,
      properties: {
        model: { type: 'string' },
        durationMs: {
          type: 'integer',
          minimum: 0,
        },
      },
    },
  },
} as const;

import { z } from 'zod';

export const validateRequestSchema = z.object({
  text: z
    .string()
    .min(1, 'Текст технического задания не может быть пустым')
    .max(50_000, 'Текст технического задания превышает 50 000 символов'),
});

export type ValidateRequestBody = z.infer<typeof validateRequestSchema>;

export const usageInfoSchema = z.object({
  limit: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  resetsAt: z.string(),
});

export type UsageResponseBody = z.infer<typeof usageInfoSchema>;

export const validateResponseSchema = z.object({
  markdown: z.string(),
  meta: z.object({
    model: z.string(),
    durationMs: z.number().int().nonnegative(),
  }),
  usage: usageInfoSchema,
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

export const usageResponseJsonSchema = {
  type: 'object',
  required: ['limit', 'used', 'remaining', 'resetsAt'],
  additionalProperties: false,
  properties: {
    limit: { type: 'integer', minimum: 0 },
    used: { type: 'integer', minimum: 0 },
    remaining: { type: 'integer', minimum: 0 },
    resetsAt: { type: 'string' },
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
  required: ['markdown', 'meta', 'usage'],
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
    usage: usageResponseJsonSchema,
  },
} as const;

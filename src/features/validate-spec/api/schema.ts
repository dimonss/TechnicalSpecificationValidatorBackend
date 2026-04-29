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

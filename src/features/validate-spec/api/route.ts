import { Readable } from 'node:stream';
import type { FastifyPluginAsync } from 'fastify';
import { idealSpecTemplate } from '../../../shared/prompts/idealSpecTemplate.ts';
import { AppError, QuotaExceededError, ValidationError } from '../../../shared/errors/AppError.ts';
import { getAuthContext } from '../../../shared/auth/authHelper.ts';
import type { ValidateSpecService } from '../model/service.ts';
import {
  errorResponseJsonSchema,
  healthResponseJsonSchema,
  templateResponseJsonSchema,
  usageResponseJsonSchema,
  validateRequestJsonSchema,
  validateRequestSchema,
  validateResponseJsonSchema,
} from './schema.ts';

export interface ValidateSpecRouteOptions {
  service: ValidateSpecService;
  jwtSecret?: string;
  whitelistUsers?: string;
}

export const validateSpecRoute: FastifyPluginAsync<ValidateSpecRouteOptions> = async (
  fastify,
  { service, jwtSecret, whitelistUsers },
) => {
  fastify.post(
    '/api/validate',
    {
      schema: {
        tags: ['Validation'],
        summary: 'Validate a technical specification',
        description:
          'Sends the technical specification text to Gemini and returns validation feedback in Markdown.',
        body: validateRequestJsonSchema,
        response: {
          200: validateResponseJsonSchema,
          400: errorResponseJsonSchema,
          429: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
          502: errorResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const parsed = validateRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        const message =
          parsed.error.issues.map((i) => i.message).join('; ') ||
          'Некорректное тело запроса';
        throw new ValidationError(message);
      }

      const authInfo = getAuthContext(
        request.headers.authorization,
        request.ip,
        jwtSecret,
        whitelistUsers,
      );

      const result = await service.validate(
        parsed.data.text,
        authInfo.clientKey,
        authInfo.isWhitelisted,
      );
      return reply.send(result);
    },
  );

  fastify.post(
    '/api/validate/stream',
    {
      schema: {
        tags: ['Validation'],
        summary: 'Validate a technical specification with Server-Sent Events stream',
        description:
          'Streams validation feedback chunks via SSE, followed by completion metadata and quota usage.',
        body: validateRequestJsonSchema,
        response: {
          400: errorResponseJsonSchema,
          429: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const parsed = validateRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        const message =
          parsed.error.issues.map((i) => i.message).join('; ') ||
          'Некорректное тело запроса';
        throw new ValidationError(message);
      }
      const validatedText = parsed.data.text;

      const authInfo = getAuthContext(
        request.headers.authorization,
        request.ip,
        jwtSecret,
        whitelistUsers,
      );

      const currentUsage = service.getUsage(authInfo.clientKey, authInfo.isWhitelisted);
      if (!authInfo.isWhitelisted && currentUsage.remaining <= 0) {
        throw new QuotaExceededError('Дневной лимит запросов исчерпан');
      }

      reply.type('text/event-stream; charset=utf-8');
      reply.header('Cache-Control', 'no-cache, no-transform');
      reply.header('Connection', 'keep-alive');
      reply.header('X-Accel-Buffering', 'no');

      const clientAbortController = new AbortController();
      if (request.raw.socket) {
        request.raw.socket.once('close', () => {
          if (!reply.raw.writableEnded) {
            clientAbortController.abort();
          }
        });
      }

      async function* sseGenerator() {
        try {
          for await (const event of service.validateStream(
            validatedText,
            authInfo.clientKey,
            authInfo.isWhitelisted,
            clientAbortController.signal,
          )) {
            if (clientAbortController.signal.aborted) break;

            if (event.type === 'chunk') {
              yield `event: chunk\ndata: ${JSON.stringify({ text: event.text })}\n\n`;
            } else if (event.type === 'done') {
              yield `event: done\ndata: ${JSON.stringify({ meta: event.meta, usage: event.usage })}\n\n`;
            }
          }
        } catch (err) {
          if (!clientAbortController.signal.aborted) {
            request.log.error({ err }, 'Streaming validation error');
            const errorPayload = {
              error: {
                code: err instanceof AppError ? err.code : 'STREAM_ERROR',
                message: err instanceof Error ? err.message : 'Ошибка потоковой валидации',
              },
            };
            yield `event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`;
          }
        }
      }

      return reply.send(Readable.from(sseGenerator()));
    },
  );



  fastify.get(
    '/api/usage',
    {
      schema: {
        tags: ['Quota'],
        summary: 'Get request usage and quota details',
        response: {
          200: usageResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const authInfo = getAuthContext(
        request.headers.authorization,
        request.ip,
        jwtSecret,
        whitelistUsers,
      );
      return reply.send(service.getUsage(authInfo.clientKey, authInfo.isWhitelisted));
    },
  );

  fastify.get(
    '/api/template',
    {
      schema: {
        tags: ['Template'],
        summary: 'Get the reference technical specification template',
        response: {
          200: templateResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    async (_request, reply) => {
      return reply.send({ markdown: idealSpecTemplate });
    },
  );

  fastify.get(
    '/api/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Check API health',
        response: {
          200: healthResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    async (_request, reply) => {
      return reply.send({ status: 'ok' });
    },
  );
};


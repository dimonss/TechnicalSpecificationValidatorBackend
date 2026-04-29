import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { Env } from '../shared/config/env.ts';
import { AppError } from '../shared/errors/AppError.ts';
import {
  GeminiClient,
  ValidateSpecService,
  validateSpecRoute,
} from '../features/validate-spec/index.ts';

export const buildServer = async (env: Env): Promise<FastifyInstance> => {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
          : undefined,
    },
    bodyLimit: 1024 * 1024,
  });

  await fastify.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    methods: ['GET', 'POST'],
  });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn({ err: error }, 'AppError');
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    request.log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Внутренняя ошибка сервера',
      },
    });
  });

  const gemini = new GeminiClient(env.GEMINI_API_KEY, env.GEMINI_MODEL);
  const service = new ValidateSpecService(gemini);

  await fastify.register(validateSpecRoute, { service });

  return fastify;
};

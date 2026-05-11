import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
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

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Technical Specification Validator API',
        description: 'REST API for validating technical specification text with Google Gemini.',
        version: '1.0.0',
      },
      tags: [
        { name: 'Health', description: 'Service health checks' },
        { name: 'Template', description: 'Reference technical specification template' },
        { name: 'Validation', description: 'Technical specification validation' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      deepLinking: true,
      docExpansion: 'list',
    },
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

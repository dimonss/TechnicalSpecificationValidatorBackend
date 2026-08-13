import type { FastifyPluginAsync } from 'fastify';
import { idealSpecTemplate } from '../../../shared/prompts/idealSpecTemplate.ts';
import { ValidationError } from '../../../shared/errors/AppError.ts';
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


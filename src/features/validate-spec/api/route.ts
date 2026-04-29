import type { FastifyPluginAsync } from 'fastify';
import { idealSpecTemplate } from '../../../shared/prompts/idealSpecTemplate.ts';
import { ValidationError } from '../../../shared/errors/AppError.ts';
import type { ValidateSpecService } from '../model/service.ts';
import { validateRequestSchema } from './schema.ts';

export interface ValidateSpecRouteOptions {
  service: ValidateSpecService;
}

export const validateSpecRoute: FastifyPluginAsync<ValidateSpecRouteOptions> = async (
  fastify,
  { service },
) => {
  fastify.post('/api/validate', async (request, reply) => {
    const parsed = validateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const message =
        parsed.error.issues.map((i) => i.message).join('; ') ||
        'Некорректное тело запроса';
      throw new ValidationError(message);
    }

    const result = await service.validate(parsed.data.text);
    return reply.send(result);
  });

  fastify.get('/api/template', async (_request, reply) => {
    return reply.send({ markdown: idealSpecTemplate });
  });

  fastify.get('/api/health', async (_request, reply) => {
    return reply.send({ status: 'ok' });
  });
};

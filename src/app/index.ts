import { loadEnv } from '../shared/config/env.ts';
import { buildServer } from './server.ts';

const start = async (): Promise<void> => {
  let env;
  try {
    env = loadEnv();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }

  const server = await buildServer(env);

  try {
    await server.listen({ port: env.PORT, host: env.HOST });
    server.log.info(`Backend listening on http://${env.HOST}:${env.PORT}`);
  } catch (error) {
    server.log.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    server.log.info({ signal }, 'Shutting down');
    try {
      await server.close();
      process.exit(0);
    } catch (error) {
      server.log.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

void start();

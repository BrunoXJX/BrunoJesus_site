import { buildApp } from "./app";
import { env, SERVICE_NAME } from "./config/env";
import prisma from "./database/prisma";

async function startServer(): Promise<void> {
  const app = await buildApp();

  try {
    await prisma.$connect();
    await app.listen({
      host: env.HOST,
      port: env.PORT
    });

    app.log.info(
      {
        service: SERVICE_NAME,
        host: env.HOST,
        port: env.PORT
      },
      "Server started"
    );

    const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
      app.log.info({ signal }, "Shutdown signal received");
      await app.close();
      process.exit(0);
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    app.log.error(
      {
        error: error instanceof Error ? error.message : error
      },
      "Failed to start server"
    );

    await app.close();
    process.exit(1);
  }
}

void startServer();

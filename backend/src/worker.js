import "dotenv/config";
import { validateEnv } from "./infrastructure/config/envValidator.js";
validateEnv();

import { startWorkers, stopWorkers } from "./infrastructure/workers/WorkerManager.js";
import { closeQueues } from "./infrastructure/queues/queueManager.js";
import { logger } from "./infrastructure/logging/logger.js";

const run = async () => {
  logger.info('[WorkerProcess] Starting standalone worker process...');
  
  startWorkers();

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`[WorkerProcess] Received ${signal}. Gracefully shutting down...`);
    await stopWorkers();
    await closeQueues();
    logger.info('[WorkerProcess] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

run();

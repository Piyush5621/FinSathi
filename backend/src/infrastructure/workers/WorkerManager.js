import { logger } from '../logging/logger.js';

const workers = [];

export const startWorkers = () => {
  logger.info('[WorkerManager] Background worker pool initialized');
};

export const stopWorkers = async () => {
  logger.info('[WorkerManager] Gracefully shutting down workers...');
  for (const worker of workers) {
    await worker.close();
  }
  logger.info('[WorkerManager] All workers shut down.');
};


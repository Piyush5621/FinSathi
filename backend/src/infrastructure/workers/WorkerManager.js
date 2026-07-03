import { ReputationWorker } from './ReputationWorker.js';
import { GrowthWorker } from './GrowthWorker.js';
import { logger } from '../logging/logger.js';

const workers = [];

export const startWorkers = () => {
  workers.push(new ReputationWorker());
  workers.push(new GrowthWorker());
  logger.info('[WorkerManager] Started background workers');
};

export const stopWorkers = async () => {
  logger.info('[WorkerManager] Gracefully shutting down workers...');
  for (const worker of workers) {
    await worker.close();
  }
  logger.info('[WorkerManager] All workers shut down.');
};

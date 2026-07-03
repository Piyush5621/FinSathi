import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const contextStorage = new AsyncLocalStorage();

export const correlationIdMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  contextStorage.run({ correlationId }, () => {
    next();
  });
};

export const getCorrelationId = () => {
  const store = contextStorage.getStore();
  return store?.correlationId || uuidv4(); // fallback
};

import { logger } from '../infrastructure/logging/logger.js';
import { BaseError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  const httpCode = err.statusCode || err.httpCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const isOperational = err.isOperational !== undefined 
    ? err.isOperational 
    : (httpCode >= 400 && httpCode < 500);
  const name = err.name || err.code || 'InternalServerError';

  // Log the error via structured logger
  if (isOperational) {
    logger.warn(err.message, { stack: err.stack, name, details: err.details });
  } else {
    logger.error(err.message, { stack: err.stack, name });
  }

  // Build standard response structure
  const responseBody = {
    success: false,
    message: err.message || (isOperational ? 'Invalid request' : 'An internal error occurred. Please try again later.'),
    error: {
      type: name,
      message: err.message || 'An internal error occurred. Please try again later.',
      details: err.details || null
    }
  };

  if (process.env.NODE_ENV !== 'production' && !isOperational) {
    responseBody.error.stack = err.stack;
  }

  res.status(httpCode).json(responseBody);
};

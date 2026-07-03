import { logger } from '../infrastructure/logging/logger.js';
import { BaseError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  // If the error is not a known BaseError, default to a 500 InfrastructureError
  const isOperational = err.isOperational !== undefined ? err.isOperational : false;
  const httpCode = err.httpCode || 500;
  const name = err.name || 'InternalServerError';

  // Log the error via structured logger
  if (isOperational) {
    logger.warn(err.message, { stack: err.stack, name: err.name });
  } else {
    logger.error(err.message, { stack: err.stack, name: err.name });
  }

  // Strip sensitive info from 500s in production
  const responseBody = {
    success: false,
    error: {
      type: name,
      message: isOperational ? err.message : 'An internal error occurred. Please try again later.'
    }
  };

  if (process.env.NODE_ENV !== 'production' && !isOperational) {
    responseBody.error.stack = err.stack;
  }

  res.status(httpCode).json(responseBody);
};

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
  const errorMessage = err.message || (isOperational ? 'Invalid request' : 'An internal error occurred. Please try again later.');
  const responseBody = {
    success: false,
    message: errorMessage,
    error: errorMessage,
    error_details: {
      type: name,
      message: errorMessage,
      details: err.details || null
    }
  };

  if (process.env.NODE_ENV !== 'production' && !isOperational) {
    responseBody.error_details.stack = err.stack;
  }


  res.status(httpCode).json(responseBody);
};

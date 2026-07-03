import winston from 'winston';
import { getCorrelationId } from './correlation.js';

const { combine, timestamp, printf, json, errors } = winston.format;

// Standard JSON formatter for production
const logFormat = combine(
  timestamp(),
  errors({ stack: true }),
  printf((info) => {
    return JSON.stringify({
      timestamp: info.timestamp,
      severity: info.level.toUpperCase(),
      correlationId: getCorrelationId(),
      service: info.service || 'api',
      tenantId: info.tenantId || null,
      userId: info.userId || null,
      storeId: info.storeId || null,
      eventType: info.eventType || null,
      message: info.message,
      stack: info.stack || undefined
    });
  })
);

// Fallback to simple console formatter for local dev if preferred, 
// but user requested strict structured logging everywhere.
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'finsathi-backend' },
  transports: [
    new winston.transports.Console()
  ]
});

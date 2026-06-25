/**
 * Mock Sentry / Performance Monitoring Middleware
 * Flags API requests taking longer than 200ms
 */
export const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 200) {
      console.warn(`[PERF_ALERT] Slow Request: ${req.method} ${req.originalUrl} took ${duration}ms`);
      // Here you would normally do: Sentry.captureMessage('Slow request...', 'warning');
    }
  });

  next();
};

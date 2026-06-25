/**
 * Response Time Middleware — Phase 4 Observability
 * Adds X-Response-Time header (in ms) to every API response.
 */
export function responseTime(req, res, next) {
  // Record the start time
  const start = process.hrtime.bigint();

  // The 'finish' event is safe for logging, just not for setting headers
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6;
    
    // Log the response time to your terminal so you can still monitor performance
    console.log(`${req.method} ${req.originalUrl} - ${ms.toFixed(1)}ms`);
  });

  next();
}
import NodeCache from "node-cache";

// Fallback memory cache
const localCache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

// Redis client instance
let redisClient = null;

/**
 * Initialize or attach Redis client
 */
export const initRedis = (clientOrUrl) => {
  if (!clientOrUrl) return;
  if (typeof clientOrUrl === "object" && clientOrUrl !== null) {
    redisClient = clientOrUrl;
  }
};

export const setRedisClient = (client) => {
  redisClient = client;
};

export const getRedisClient = () => redisClient;

/**
 * Core Cache Service
 */
export const CacheService = {
  get: async (key) => {
    try {
      if (redisClient && (redisClient.status === "ready" || typeof redisClient.get === "function")) {
        const data = await redisClient.get(key);
        if (!data) return null;
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      }
    } catch (err) {
      console.warn("[CacheService] Redis get failed, falling back to memory:", err.message);
    }
    return localCache.get(key) || null;
  },

  set: async (key, value, ttlSeconds = 300) => {
    try {
      if (redisClient && (redisClient.status === "ready" || typeof redisClient.set === "function")) {
        const serialized = typeof value === "string" ? value : JSON.stringify(value);
        // Supports both ioredis ('EX', ttl) and redis v4 ({ EX: ttl })
        if (redisClient.set.length >= 3) {
          await redisClient.set(key, serialized, "EX", ttlSeconds);
        } else {
          await redisClient.set(key, serialized, { EX: ttlSeconds });
        }
        return true;
      }
    } catch (err) {
      console.warn("[CacheService] Redis set failed, falling back to memory:", err.message);
    }
    localCache.set(key, value, ttlSeconds);
    return true;
  },

  del: async (key) => {
    try {
      if (redisClient && (redisClient.status === "ready" || typeof redisClient.del === "function")) {
        await redisClient.del(key);
      }
    } catch (err) {
      console.warn("[CacheService] Redis del failed:", err.message);
    }
    localCache.del(key);
    return true;
  },

  // Prefix invalidation (tenant/organization scoped)
  invalidatePrefix: async (prefix) => {
    let deletedCount = 0;
    try {
      if (redisClient && (redisClient.status === "ready" || typeof redisClient.keys === "function")) {
        const keys = await redisClient.keys(`${prefix}*`);
        if (Array.isArray(keys) && keys.length > 0) {
          await redisClient.del(...keys);
          deletedCount += keys.length;
        }
      }
    } catch (err) {
      console.warn("[CacheService] Redis invalidatePrefix error:", err.message);
    }

    const localKeys = localCache.keys();
    const toDelete = localKeys.filter((k) => k.startsWith(prefix));
    if (toDelete.length > 0) {
      localCache.del(toDelete);
      deletedCount += toDelete.length;
    }

    return deletedCount;
  },

  clearAll: async () => {
    try {
      if (redisClient && typeof redisClient.flushdb === "function") {
        await redisClient.flushdb();
      }
    } catch {}
    localCache.flushAll();
  }
};

/**
 * Standardized Financial Intelligence Cache Key Namespaces
 */
export const FinancialCacheKeys = {
  getPrefix: (tenantOrUserId) => `fin_intel:${tenantOrUserId}:`,
  dashboard: (tenantOrUserId) => `fin_intel:${tenantOrUserId}:dashboard`,
  healthScore: (tenantOrUserId) => `fin_intel:${tenantOrUserId}:health_score`,
  cashFlow: (tenantOrUserId) => `fin_intel:${tenantOrUserId}:cashflow`,
  creditScore: (tenantOrUserId) => `fin_intel:${tenantOrUserId}:credit`,
  dailyBrief: (tenantOrUserId, date = "") =>
    date ? `fin_intel:${tenantOrUserId}:daily_brief:${date}` : `fin_intel:${tenantOrUserId}:daily_brief`,
  anomalies: (tenantOrUserId) => `fin_intel:${tenantOrUserId}:anomalies`,
  analyticsSummary: (tenantOrUserId) => `fin_intel:${tenantOrUserId}:analytics:summary`,
  analyticsMetrics: (tenantOrUserId) => `fin_intel:${tenantOrUserId}:analytics:metrics`,
  analyticsPnl: (tenantOrUserId) => `fin_intel:${tenantOrUserId}:analytics:pnl`,
  analyticsTrend: (tenantOrUserId, queryKey = "") =>
    `fin_intel:${tenantOrUserId}:analytics:trend:${queryKey}`,
  analyticsTopProducts: (tenantOrUserId, queryKey = "") =>
    `fin_intel:${tenantOrUserId}:analytics:top_products:${queryKey}`,
  analyticsTopCustomers: (tenantOrUserId, queryKey = "") =>
    `fin_intel:${tenantOrUserId}:analytics:top_customers:${queryKey}`,
};

/**
 * High-Level Financial Cache Service
 */
export const FinancialCacheService = {
  /**
   * Invalidate all financial intelligence caches for a given organization and/or user
   */
  async invalidate(orgId, userId = null) {
    const targets = new Set();
    if (orgId) targets.add(orgId);
    if (userId) targets.add(userId);

    for (const target of targets) {
      const prefix = FinancialCacheKeys.getPrefix(target);
      await CacheService.invalidatePrefix(prefix);
    }
  },

  async get(key) {
    return await CacheService.get(key);
  },

  async set(key, value, ttlSeconds = 300) {
    return await CacheService.set(key, value, ttlSeconds);
  },

  async del(key) {
    return await CacheService.del(key);
  }
};

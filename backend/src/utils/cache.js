import NodeCache from "node-cache";

// Fallback memory cache
const localCache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

// If REDIS_URL is provided in the future, we will initialize RedisClient here
let redisClient = null;

// Use this to plug in actual Redis later
export const initRedis = async (url) => {
  if (!url) return;
  // const { createClient } = require('redis');
  // redisClient = createClient({ url });
  // await redisClient.connect();
  // console.log("Enterprise Redis Cache connected");
};

export const CacheService = {
  get: async (key) => {
    if (redisClient) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
    return localCache.get(key);
  },

  set: async (key, value, ttlSeconds = 300) => {
    if (redisClient) {
      await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } else {
      localCache.set(key, value, ttlSeconds);
    }
  },

  del: async (key) => {
    if (redisClient) {
      await redisClient.del(key);
    } else {
      localCache.del(key);
    }
  },

  // Prefix invalidation
  invalidatePrefix: async (prefix) => {
    if (redisClient) {
      const keys = await redisClient.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      const keys = localCache.keys();
      const toDelete = keys.filter(k => k.startsWith(prefix));
      if (toDelete.length > 0) {
        localCache.del(toDelete);
      }
    }
  }
};

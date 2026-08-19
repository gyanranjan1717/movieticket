import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) {
      console.warn("Redis connection failed. Running without Redis cache/locks.");
      return null; // Stop retrying
    }
    return Math.min(times * 100, 2000);
  },
});

redis.on("connect", () => {
  console.log("Connected to Redis successfully.");
});

redis.on("error", (err) => {
  console.warn("Redis warning/error:", err.message);
});

// Helper to safely execute Redis calls without crashing app if Redis is offline
export const safeRedisGet = async (key) => {
  try {
    if (redis.status === "ready") {
      return await redis.get(key);
    }
  } catch (err) {
    console.warn(`Redis GET error for key ${key}:`, err.message);
  }
  return null;
};

export const safeRedisSet = async (key, value, mode, duration, flag) => {
  try {
    if (redis.status === "ready") {
      if (mode && duration && flag) {
        return await redis.set(key, value, mode, duration, flag);
      }
      if (mode && duration) {
        return await redis.set(key, value, mode, duration);
      }
      return await redis.set(key, value);
    }
  } catch (err) {
    console.warn(`Redis SET error for key ${key}:`, err.message);
  }
  return null;
};

export const safeRedisDel = async (key) => {
  try {
    if (redis.status === "ready") {
      return await redis.del(key);
    }
  } catch (err) {
    console.warn(`Redis DEL error for key ${key}:`, err.message);
  }
  return null;
};

// Attempt non-blocking connection
redis.connect().catch((err) => {
  console.warn("Initial Redis connection failed:", err.message);
});

export default redis;

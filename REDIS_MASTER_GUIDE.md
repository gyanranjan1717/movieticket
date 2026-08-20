# 🚀 The Ultimate Redis Master Guide & Project Implementation Reference

> **Welcome to your complete Redis handbook!** Whether you are starting from zero or preparing for high-level system design interviews, this document is crafted to make you an absolute expert in **Redis**, covering fundamental theory, production architecture, interview questions, and a detailed walkthrough of how Redis is implemented in **this Movie Ticket Booking Application**.

---

## 📚 Table of Contents

1. [What is Redis & Why is it so Fast?](#1-what-is-redis--why-is-it-so-fast)
2. [Core Redis Data Structures](#2-core-redis-data-structures)
   - [Redis Deployment Models (Upstash vs Local vs Docker vs Managed)](#25-redis-deployment-models-upstash-vs-local-vs-docker-vs-managed-redis)
3. [How Redis is Implemented in THIS Project (`movieticket`)](#3-how-redis-is-implemented-in-this-project-movieticket)
   - [Config & Safe Fallback (`backend/configs/redis.js`)](#a-connection--safe-fallback-backendconfigsredisjs)
   - [Cache-Aside Pattern (`backend/controllers/tmdbController.js`)](#b-api--db-response-caching-backendcontrollerstmdbcontrollerjs)
   - [Distributed Seat Locks (`backend/controllers/bookingController.js`)](#c-distributed-concurrency-locking-backendcontrollersbookingcontrollerjs)
   - [User Recommendation Caching (`backend/controllers/recommendationController.js`)](#d-personalized-recommendation-caching--invalidation-backendcontrollersrecommendationcontrollerjs)
4. [Redis Caching Strategies & Architecture](#4-redis-caching-strategies--architecture)
5. [Persistence: RDB vs AOF](#5-persistence-rdb-vs-aof)
6. [Memory Eviction Policies](#6-memory-eviction-policies)
7. [Distributed Locks & Race Conditions](#7-distributed-locks--race-conditions)
8. [High Availability & Scaling (Sentinel & Cluster)](#8-high-availability--scaling-sentinel--cluster)
9. [Redis Command Cheat Sheet](#9-redis-command-cheat-sheet)
10. [Top Redis Interview Questions & Answers](#10-top-redis-interview-questions--answers)
    - [Basic / Junior Level](#level-1-basic--junior)
    - [Intermediate / System Design](#level-2-intermediate--system-design)
    - [Advanced / Senior Level](#level-3-advanced--senior)

---

## 1. What is Redis & Why is it so Fast?

**Redis** stands for **RE**mote **DI**ctionary **S**erver. It is an open-source, in-memory data store used as a database, cache, streaming engine, and message broker.

### Key Characteristics:
- **In-Memory Storage**: Data resides in RAM (Random Access Memory), yielding read/write operations under 1 millisecond. (Disk operations take milliseconds; RAM operations take nanoseconds/microseconds).
- **Single-Threaded Event Loop**: Redis executes core commands using a single event loop thread built on multiplexing primitives (`epoll` on Linux, `kqueue` on macOS).
  - *Why single-threaded?* It avoids context-switching, thread synchronization, mutex lock contention, and race conditions inside memory management.
  - *Note*: Redis 6.0+ introduced multi-threaded I/O for socket reading/writing, but command execution remains single-threaded.
- **Key-Value Schema**: Every record is mapped to a unique string key. Values can be primitive strings or rich data structures like Hashes, Lists, and Sets.

---

## 2. Core Redis Data Structures

Redis is not just a plain key-value store like Memcached; it supports rich data structures:

| Data Type | Description | Common Use Case | Example Commands |
| :--- | :--- | :--- | :--- |
| **Strings** | Binary-safe data up to 512MB (Text, JSON, Images, Integers) | API Caching, Sessions, Rate Limiters | `SET`, `GET`, `INCR`, `DECR`, `EXPIRE` |
| **Hashes** | Field-value pairs (like a JSON object / dictionary) | User Profiles, Movie Metadata | `HSET`, `HGET`, `HGETALL`, `HDEL` |
| **Lists** | Linked lists of strings (Insertion order) | Message Queues, Activity Feeds | `LPUSH`, `RPUSH`, `LPOP`, `RPOP`, `LRANGE` |
| **Sets** | Unordered collections of unique strings | Unique Visitors, User Tags, Likes | `SADD`, `SMEMBERS`, `SISMEMBER`, `SINTER` |
| **Sorted Sets (ZSet)** | Sets ordered by a floating-point `score` | Leaderboards, Priority Queues | `ZADD`, `ZRANGE`, `ZREVRANGEBYSCORE` |
| **Bitmaps** | Bit array manipulation | Daily Active Users (DAU), Feature Flags | `SETBIT`, `GETBIT`, `BITCOUNT` |
| **HyperLogLog** | Probabilistic cardinality estimation | Counting billions of unique items with <1% error using 12KB | `PFADD`, `PFCOUNT` |
| **Streams** | Append-only log data structure | Event Streaming, Distributed Task Queues | `XADD`, `XREAD`, `XGROUP` |

---

## 2.5 Redis Deployment Models: Upstash vs. Local vs. Docker vs. Managed Redis

Choosing how to run Redis depends entirely on your environment (Development vs. Production) and hosting architecture. Here is a definitive guide:

| Redis Option | Best For | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Local Redis** | Quick local coding/debugging (Mac/Linux) | • 100% Free & Offline<br>• Zero latency (<0.1ms)<br>• No internet required | • Hard to install natively on Windows (requires WSL)<br>• Data resets when host system restarts unless configured |
| **Docker Redis** | Standardized local dev teams & microservices | • Run with one command (`docker-compose up`) <br>• Identical setup on Windows/Mac/Linux<br>• Isolated environment | • Requires Docker Desktop running in the background<br>• Uses system RAM overhead for the Docker engine |
| **Upstash Redis** | Cloud serverless deployments (Vercel, Render, AWS Lambda) | • 100% Managed (Zero maintenance)<br>• Generous free tier<br>• Reaches through cloud firewalls via secure TLS/HTTPS | • Higher latency than local (network request hop)<br>• Limits on daily API operations on free tier |
| **Managed Cloud (AWS ElastiCache)**| High-traffic enterprise applications | • Maximum performance (<1ms latency)<br>• Automatic sharding & failover<br>• Complete custom config access | • Very expensive ($15+/month minimum)<br>• Complex VPC/networking setup required |

### Summary Cheat Sheet:
* **Coding locally on Windows/Mac?** Use **Docker Redis**. It guarantees consistency and avoids native install issues.
* **Deploying to Vercel/Render for free?** Use **Upstash Redis**. Since serverless environments are stateless, they cannot run Redis on-disk locally; they must connect to an external TLS-secured URL.
* **Deploying a high-speed production app on AWS EC2/ECS?** Use **AWS ElastiCache** or **Redis Enterprise** for sub-millisecond in-VPC latency.

---

## 3. How Redis is Implemented in THIS Project (`movieticket`)

In this **Movie Ticket Booking Application**, Redis is integrated using [`ioredis`](https://github.com/redis/ioredis) in Node.js for **two critical production capabilities**:
1. **Response Caching (Cache-Aside Pattern)** for external API calls (TMDB API) to eliminate latency and rate limits.
2. **Distributed Seat Locking (`SET NX PX`)** to prevent **Double-Booking Race Conditions** when multiple users attempt to pick the exact same theater seat simultaneously.

Here is the exact step-by-step breakdown of how these are implemented in the code:

---

### A. Connection & Safe Fallback ([`backend/configs/redis.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/configs/redis.js))

#### What it does:
- Initializes the `ioredis` client connecting to process environment variable `REDIS_URL` or `redis://localhost:6379`.
- Uses a **Retry Strategy**: Stops retrying after 3 attempts if Redis is offline.
- Exposes **Safe Wrappers** (`safeRedisGet`, `safeRedisSet`, `safeRedisDel`).

#### Why Safe Wrappers matter:
If Redis goes down in production, a naive `redis.get()` will throw an unhandled promise rejection and crash your entire web server. The safe wrappers catch any connection error gracefully, return `null`, and allow the application to **fall back directly to MongoDB or TMDB** without user interruption.

```javascript
// backend/configs/redis.js snippet
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
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

export const safeRedisGet = async (key) => {
  try {
    if (redis.status === "ready") return await redis.get(key);
  } catch (err) {
    console.warn(`Redis GET error for key ${key}:`, err.message);
  }
  return null; // Graceful fallback
};
```

---

### B. API & DB Response Caching ([`backend/controllers/tmdbController.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/controllers/tmdbController.js))

#### What it does:
When users fetch **Upcoming Releases** or **Now Playing Movies**, fetching from TMDB over HTTP takes 300ms–1500ms. 

#### Implementation Logic (Cache-Aside / Lazy Loading):
1. Construct key: `cache:tmdb_upcoming`.
2. Check Redis via `safeRedisGet(cacheKey)`.
3. **If CACHE HIT**: Parse JSON and immediately return to client (~2ms response time).
4. **If CACHE MISS**:
   - Fetch data from external TMDB API.
   - Format images and movie details.
   - Store in Redis with **12-Hour Expiration (TTL)**: `safeRedisSet(cacheKey, JSON.stringify(formatted), "EX", 43200)`.
   - Return payload to client.

```javascript
// backend/controllers/tmdbController.js snippet
export const getUpcomingReleases = async (req, res) => {
  const cacheKey = "cache:tmdb_upcoming";
  
  // 1. Check Redis Cache
  const cached = await safeRedisGet(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, movies: JSON.parse(cached), cached: true });
  }

  // 2. Fetch from TMDB API on cache miss
  const { data } = await axios.get(`${TMDB_BASE_URL}/movie/upcoming`, { params: { api_key: TMDB_API_KEY } });
  const formatted = formatTmdbMovies(data.results);

  // 3. Save to Redis with 12 Hours TTL (43,200 seconds)
  await safeRedisSet(cacheKey, JSON.stringify(formatted), "EX", 43200);

  return res.status(200).json({ success: true, movies: formatted, cached: false });
};
```

---

### C. Distributed Concurrency Locking ([`backend/controllers/bookingController.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/controllers/bookingController.js))

#### The Problem (Race Condition):
Imagine User A and User B click "Book Seat A1" at the exact same millisecond:
- Without Redis: Both requests pass DB checks concurrently before either record updates. Result: **Double-booking / two tickets sold for 1 seat!**

#### The Solution (Redis Mutex Lock):
We use Redis' atomic `SET key value PX milliseconds NX` command:
- `NX`: **Set if Not eXists**. Returns `"OK"` if key was created, or `null` if someone else holds it.
- `PX 15000`: **Expire automatically in 15 seconds** (prevents deadlock if server crashes mid-booking).

#### Code Flow:
```
User Click -> acquireSeatLocks() -> SET lock:show:123:seat:A1 userId PX 15000 NX
                ├──> Success? Continue to DB save & Stripe checkout -> Release Lock
                └──> Fail? Return 400 "Seat currently being booked by another user"
```

```javascript
// backend/controllers/bookingController.js snippet
export const acquireSeatLocks = async (showId, selectedSeats, userId) => {
  const lockTTL = 15000; // 15 seconds
  const lockedKeys = [];

  for (const seat of selectedSeats) {
    const lockKey = `lock:show:${showId}:seat:${seat}`;
    
    // Atomic lock acquisition
    const acquired = await safeRedisSet(lockKey, userId, "PX", lockTTL, "NX");
    
    if (!acquired) {
      // Roll back any locks acquired in this batch if one seat fails
      for (const key of lockedKeys) {
        await safeRedisDel(key);
      }
      return false; // Seat is locked by another user!
    }
    lockedKeys.push(lockKey);
  }
  return true;
};
```

---

### D. Personalized Recommendation Caching & Invalidation ([`backend/controllers/recommendationController.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/controllers/recommendationController.js))

#### What it does:
Computing user recommendations (genre scoring, cast matching, candidate sorting) requires multiple database population calls (`Booking.find`, `User.findById`, `Movie.find`). Because a user's taste profile does not change on every page refresh, caching recommendations in Redis drops response times from ~200ms to **~2ms**.

#### Implementation Logic:
1. **Cache Read**: Check key `cache:recommendations:${userId}` in Redis.
2. **On Cache Hit**: Instantly return cached recommendations array.
3. **On Cache Miss**: Run content-based filtering algorithm, save output to Redis with **1-Hour TTL (`EX 3600`)**, and return results.
4. **Proactive Invalidation**: When the user performs actions that change their taste profile:
   - Creating a new booking in `bookingController.js`: `await safeRedisDel("cache:recommendations:" + userId)`
   - Toggling a favorite movie in `userController.js`: `await safeRedisDel("cache:recommendations:" + userId)`

---

## 4. Redis Caching Strategies & Architecture

| Caching Pattern | How it works | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Cache-Aside (Lazy Loading)** *(Used in our app)* | App reads Cache first. On miss, reads DB, populates Cache, returns. | Only requests cached data. Safe against cache failures. | Cache miss penalty. Potential stale data until TTL expires. |
| **Write-Through** | App writes to Cache. Cache synchronously updates DB before responding. | Data in cache is never stale. | Higher write latency. Many cached items may never be read. |
| **Write-Behind (Write-Back)** | App writes to Cache immediately. Cache asynchronously updates DB in batches. | Blazing fast write speed. | Potential data loss if Redis crashes before flushing to DB. |
| **Refresh-Ahead** | Cache automatically reloads key before TTL expires based on usage prediction. | Zero cache miss latency for hot keys. | Hard to accurately predict access patterns. |

---

## 5. Persistence: RDB vs AOF

Redis is in-memory, but it offers **2 persistence options** to save data to disk:

### 1. RDB (Redis Database Snapshots)
- **Mechanism**: Creates point-in-time binary snapshots of all Redis memory (`dump.rdb`) at configured intervals (e.g., every 5 minutes if 100 keys changed).
- **Pros**: Compact file, fast backup/restore, zero runtime CPU overhead during snapshot generation (uses `fork()`).
- **Cons**: Potential data loss between snapshot intervals (e.g., data from last 5 minutes lost if server crashes).

### 2. AOF (Append Only File)
- **Mechanism**: Logs every write command received by the server to an append-only file (`appendonly.aof`).
- **Sync Options**: `fsync everysec` (default, lose max 1 sec), `fsync always` (slowest, max safety), `fsync no`.
- **Pros**: Maximum durability; minimal data loss.
- **Cons**: Larger file sizes than RDB; slightly slower write throughput under high load.

> 💡 **Production Best Practice**: Enable **Hybrid Persistence** (RDB + AOF enabled together). Redis uses AOF for durability on restart and RDB for fast snapshots.

---

## 6. Memory Eviction Policies

When Redis reaches its allocated RAM capacity (`maxmemory`), it evicts keys based on the configured `maxmemory-policy`:

1. **`noeviction`** (Default): Returns error when trying to write new keys. (Great when Redis is used as a primary DB).
2. **`allkeys-lru`**: Evicts **Least Recently Used** keys among ALL keys. (Best for general caching).
3. **`volatile-lru`**: Evicts **Least Recently Used** keys among keys with an **expiration (TTL)** set.
4. **`allkeys-lfu`**: Evicts **Least Frequently Used** keys (tracks access frequency counter).
5. **`volatile-lfu`**: Evicts **Least Frequently Used** keys with TTL set.
6. **`allkeys-random`**: Evicts random keys to free space.
7. **`volatile-ttl`**: Evicts keys with the shortest remaining TTL.

---

## 7. Distributed Locks & Race Conditions

### The `SET NX PX` Algorithm
To build a safe distributed lock for single-instance Redis:
```
SET lock:resource_id random_client_token PX 30000 NX
```
- **`NX`**: Only set if key does not exist.
- **`PX 30000`**: Lock automatically expires in 30,000ms.
- **Random Token**: Store a unique UUID per client. When releasing the lock, verify the token via a **Lua Script** so Client A doesn't accidentally delete Client B's lock if Client A's operation exceeded the TTL window!

```lua
-- Safe Lock Release Lua Script
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```

---

## 8. High Availability & Scaling (Sentinel & Cluster)

### 1. Master-Replica Replication
- One Primary Master node handles all **Writes** and replicates asynchronously to Replica nodes. Replicas serve read queries.

### 2. Redis Sentinel (High Availability)
- Sentinel monitors Master and Replica nodes.
- If Master fails, Sentinels conduct an election (Raft-like consensus) and automatically **promote a Replica to new Master**.

### 3. Redis Cluster (Horizontal Sharding)
- Distributes keys across **16,384 Hash Slots**.
- Slot formula: `CRC16(key) % 16384`.
- Scales to hundreds of nodes for multi-terabyte datasets and millions of requests/sec.

---

## 8.1 How to Inspect & View Stored Redis Data in THIS App

Since Redis runs inside Docker container `movieticket_redis` (or on `localhost:6379`), here are the easiest ways to view stored data:

### Method 1: Using Docker CLI (Interactive Terminal - Easiest)
Run this command in your terminal/PowerShell:
```bash
docker exec -it movieticket_redis redis-cli
```
Once inside `redis-cli`, run:
- `KEYS *` ➡️ List ALL stored keys.
- `KEYS cache:*` ➡️ List only cached API responses & recommendations.
- `KEYS lock:*` ➡️ List active seat locks.
- `GET cache:tmdb_upcoming` ➡️ View stored TMDB upcoming movies JSON.
- `GET cache:recommendations:<USER_ID>` ➡️ View user's cached recommendations.
- `TTL cache:tmdb_upcoming` ➡️ Check how many seconds are left before key expires.
- `MONITOR` ➡️ Watch real-time Redis commands as you click around your app!
- `exit` ➡️ Quit redis-cli.

### Method 2: Terminal One-Liners (Without opening interactive prompt)
```bash
# List all keys
docker exec -it movieticket_redis redis-cli KEYS "*"

# View upcoming releases cache
docker exec -it movieticket_redis redis-cli GET "cache:tmdb_upcoming"

# Check remaining TTL (seconds)
docker exec -it movieticket_redis redis-cli TTL "cache:tmdb_upcoming"
```

### Method 3: Visual Desktop GUIs (Graphical Interface)
If you prefer a visual database viewer like MongoDB Compass or TablePlus:
1. **RedisInsight** (Free official desktop app by Redis):
   - Connection Host: `localhost` | Port: `6379`
   - Browse keys visually in a tree structure, inspect formatted JSON values, view TTL countdowns, and monitor memory usage.
2. **VS Code Extensions**: Search for **Redis** or **Database Client** in VS Code extensions marketplace.

---

## 9. Redis Command Cheat Sheet

```bash
# Basic Operations
SET user:100 "John Doe"         # Set key value
GET user:100                     # Get value
EXPIRE user:100 3600             # Set TTL to 1 hour
TTL user:100                     # View remaining TTL in seconds
DEL user:100                     # Delete key
EXISTS user:100                  # Check if key exists (returns 1 or 0)

# Strings / Atomic Counters
INCR page:views                  # Increment integer by 1
INCRBY page:views 10             # Increment integer by 10
SET key value EX 60 NX           # Set key with 60s TTL if key doesn't exist

# Hashes (Objects)
HSET movie:1 title "Inception" rating 8.8
HGET movie:1 title
HGETALL movie:1

# Lists (Queues)
LPUSH queue:jobs "send_email"
RPOP queue:jobs

# Sets (Unique Items)
SADD tags:movie "Sci-Fi" "Action"
SMEMBERS tags:movie

# Sorted Sets (Leaderboards)
ZADD leaderboard 500 "PlayerA" 750 "PlayerB"
ZRANGE leaderboard 0 -1 WITHSCORES
```

---

## 10. Top Redis Interview Questions & Answers

### Level 1: Basic / Junior

#### Q1: What is Redis and how does it differ from traditional Relational Databases (like MySQL/PostgreSQL)?
> **Answer**: Redis is an in-memory key-value data structure store, whereas MySQL/PostgreSQL are disk-based relational databases. Redis stores data in RAM for sub-millisecond latency, making it ideal for caching, session storage, real-time counters, and distributed locking. MySQL stores data on disk with ACID transactions across relational tables.

#### Q2: Is Redis single-threaded? How can a single-threaded server handle tens of thousands of requests per second?
> **Answer**: Yes, Redis executes commands sequentially in a single thread using an **I/O Multiplexing event loop** (`epoll`/`kqueue`). Because all operations happen directly in memory (RAM), execution times per command are in nanoseconds. Single-threaded architecture eliminates the massive CPU overhead of OS context switching, thread synchronization locks, and race conditions.

#### Q3: What is the difference between Redis and Memcached?
> **Answer**:
> 1. **Data Types**: Redis supports Strings, Hashes, Lists, Sets, Sorted Sets, Bitmaps, and Streams. Memcached only supports simple strings.
> 2. **Persistence**: Redis supports disk persistence (RDB & AOF). Memcached is purely volatile in-memory.
> 3. **Replication**: Redis supports Master-Replica replication, Sentinels, and Clustering. Memcached relies on client-side sharding.

---

### Level 2: Intermediate / System Design

#### Q4: What is the Cache Stampede (Thundering Herd) problem and how do you prevent it?
> **Answer**: Cache Stampede occurs when a high-traffic key (e.g., home page feed) expires simultaneously. Hundreds of concurrent requests hit Redis, find a cache miss, and simultaneously query the database—overwhelming the DB.
> **Solutions**:
> 1. **Mutex / Distributed Lock**: First request acquires a Redis lock, queries DB, updates cache; others wait.
> 2. **Probabilistic Early Expiration (XFetch)**: Re-calculate and update cache shortly before expiration.
> 3. **Soft Expiration / Background Worker**: Return slightly stale data while a background cron updates cache.

#### Q5: How does Redis handle key expiration in memory?
> **Answer**: Redis uses two complementary strategies:
> 1. **Passive / Lazy Expiration**: When a client accesses a key, Redis checks if its TTL has expired. If expired, it deletes the key and returns `null`.
> 2. **Active / Periodic Expiration**: Every 100ms, Redis tests 20 random keys with TTL. If >25% are expired, it repeats the process to ensure memory is continuously freed even for un-accessed keys.

#### Q6: Explain the difference between RDB and AOF persistence in Redis.
> **Answer**: 
> - **RDB (Snapshotting)** creates point-in-time compact binary dumps (`dump.rdb`). Fast restore, minimal CPU overhead, but risks losing data between intervals.
> - **AOF (Append Only File)** logs every write command. High durability (lose max 1 second with `fsync everysec`), but larger file size and slightly higher disk I/O.

---

### Level 3: Advanced / Senior

#### Q7: How do you prevent double-booking in a movie ticket or flight reservation system using Redis?
> **Answer**: Use Redis distributed locks with atomic `SET key value PX duration NX`:
> 1. When a user selects seat `A1` for show `123`, attempt: `SET lock:show:123:seat:A1 user_id PX 15000 NX`.
> 2. If Redis returns `OK`, lock is acquired; proceed to create booking in DB and release lock.
> 3. If Redis returns `null`, seat is currently locked by another user; reject request immediately with a friendly message.
> 4. Ensure safe lock release via Lua script checking user ID token to prevent releasing another user's lock.

#### Q8: What are Hot Keys and Big Keys in Redis, and how do you resolve them?
> **Answer**:
> - **Hot Key**: A single key accessed by millions of requests/sec (e.g., celebrity post). Solved by: adding client-side local cache (in-memory LRU in Node.js/Go), replicating key across cluster slots with random prefixes (`key_1`, `key_2`).
> - **Big Key**: A key containing a massive value (e.g., a Hash or Set with millions of elements). Causes single-threaded event loop latency during reads/deletions. Solved by: splitting large datasets into smaller chunks (`hash:100:part1`), using `UNLINK` instead of `DEL` for asynchronous background deletion.

#### Q9: What is the Redlock algorithm?
> **Answer**: Redlock is a distributed locking algorithm devised by Redis creator Salvatore Sanfilippo (antirez) for multi-master Redis setups. A client acquires locks across $N$ independent Redis masters (usually 5) sequentially with a short timeout. If lock is acquired on a majority ($N/2 + 1 = 3$) of nodes within the valid TTL window, the distributed lock is considered successful and safe against single-master failures.

---

## 🎯 Summary

You now possess comprehensive knowledge of Redis from fundamental architecture to production implementation! Check out the implementation files in this repository:
- 🛠️ [`backend/configs/redis.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/configs/redis.js)
- 🎬 [`backend/controllers/tmdbController.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/controllers/tmdbController.js)
- 🎟️ [`backend/controllers/bookingController.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/controllers/bookingController.js)

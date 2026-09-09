# 🚀 ShowTime Seat Concurrency & Full-Suite Load Testing Guide

This comprehensive guide explains:
1. How to test, measure, and verify race-condition resilience on the `/api/booking/create` endpoint using **Autocannon**.
2. How to scale race-condition tests up to **1,000 concurrent users**.
3. How to benchmark and load test **all different API routes** to measure response times, throughput (RPS), and latency distribution.

---

## 📌 1. The Problem: The "Same Seat, Same Show" Concurrency Race

In high-demand ticket sales (e.g., blockbuster movies, live concerts), hundreds or thousands of users may click **"Book Now"** for the exact same seat at the exact same millisecond.

Without distributed locking and atomic database updates:
1. Two or more transactions concurrently read `occupiedSeats[seat] === undefined`.
2. Both proceed to charge payment and write the booking to the database.
3. **Result:** Catastrophic **Double-Booking**.

---

## 🛡️ 2. The Architecture: Two-Tier Concurrency Protection

Our backend uses a **two-tier defense** against race conditions:

```
[Concurrent Requests (e.g. 500 - 1,000 users)]
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│  Tier 1: Redis Distributed Lock (SETNX)          │
│  Key: lock:show:<showId>:seat:<seatId>           │
│  TTL: 15 seconds (PX 15000)                      │
└──────────────────────────┬───────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
    [1 Request Wins]              [N - 1 Requests Fail]
           │                               │
           ▼                               ▼
┌──────────────────────────────┐     HTTP 400 Bad Request
│ Tier 2: Atomic MongoDB Guard │     "Selected seats are
│ Show.findOneAndUpdate({      │      currently being booked"
│   _id: showId,               │
│   "occupiedSeats.A1":        │
│     { $exists: false }       │
│ })                           │
└──────────────┬───────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
  [Success]        [Conflict]
       │               │
       ▼               ▼
Stripe Checkout   Rollback Lock &
& Booking Created Return HTTP 400
```

1. **Tier 1 (In-Memory Speed): Redis `SET key value PX 15000 NX`**
   - Resolves locks in memory in $< 2\text{ ms}$.
   - All $N - 1$ losing requests are immediately rejected before hitting MongoDB or external APIs, protecting databases from thread pool exhaustion.
2. **Tier 2 (Persistence Safety): Atomic MongoDB Conditional Update**
   - `Show.findOneAndUpdate` ensures that even if a Redis lock expires or Redis is down, MongoDB's atomic document-level locking guarantees only one write succeeds.

---

## 🧪 3. Running the Seat Concurrency Test

### Quick Start:
```bash
cd backend
npm run test:concurrency
```

### Benchmark Results Matrix:
| Concurrency Stage | Total Requests | Target Seat | Expected 201 Success | Expected 400 Rejections | Target DB Bookings | Double-Booking Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Stage 1 (Warmup)** | 50 | `T_SEAT_50` | **1** | **49** | **1** | **0.00%** |
| **Stage 2 (Contention)** | 100 | `T_SEAT_100` | **1** | **99** | **1** | **0.00%** |
| **Stage 3 (High Concurrency)** | 500 | `T_SEAT_500` | **1** | **499** | **1** | **0.00%** |

---

## ⚡ 4. Scaling the Seat Race-Condition Test to 1,000 Concurrent Users

Testing 1,000 concurrent users firing at the exact same seat simultaneously is a true stress test of your Redis atomic lock and Node.js socket handling.

### What Changes in `scripts/load-test-seat-lock.js`:

```javascript
// 1. Expand the authenticated user pool to 1000
const MAX_USERS = 1000;

// 2. Add the 1000 step to the test matrix
const concurrencySteps = [
  { concurrency: 50, seat: 'T_SEAT_50' },
  { concurrency: 100, seat: 'T_SEAT_100' },
  { concurrency: 500, seat: 'T_SEAT_500' },
  { concurrency: 1000, seat: 'T_SEAT_1000' }, // 👈 Add 1000
];

// 3. Increase timeout in autocannon options (to allow 1000 TCP sockets to flush)
const instance = autocannon({
  url: BASE_URL,
  connections: concurrency,
  amount: concurrency,
  pipelining: 1,
  timeout: 45, // 👈 45 seconds to accommodate 1000 simultaneous connections
  requests,
});
```

### Critical Bottlenecks to Keep in Mind at 1,000 Concurrency:

* **MongoDB Connection Pool**: By default, Mongoose keeps `maxPoolSize: 100`. When 1,000 requests hit simultaneously, Redis `SETNX` intercepts ~999 of them **in memory in < 2ms**, so your MongoDB connection pool is **not** overwhelmed. This proves why Tier 1 (Redis) is critical!
* **Stripe Test Mode Rate Limits**: Because Redis allows strictly **1 request** through to Stripe, Stripe will not throttle you with HTTP 429 (*Too Many Requests*).
* **Upstash Redis Daily Quota**: Upstash free tier allows 10,000 commands/day. A 1,000-request burst uses ~2,000 Redis commands (`SETNX` + rollback `eval`), which fits comfortably within the daily limit.

---

## 📈 5. How to Load Test Different API Routes (Throughput & Latency)

General route load testing measures sustained traffic over a duration (e.g., 10 or 30 seconds) to find:
* **RPS (Requests Per Second)**: How many requests your server can serve per second.
* **Latency Distribution**: Mean, p50 (median), p95, and p99 response times.
* **Error Rate**: Whether any requests fail or time out under load.

### Method A: Quick One-Liner Testing via Autocannon CLI

You can test any route directly from your terminal using `npx autocannon`:

#### 1. High-Traffic Read Routes (Shows & Occupied Seats)
```bash
# Test active shows route with 100 concurrent users for 10 seconds
npx autocannon -c 100 -d 10 http://localhost:3001/api/show/active

# Test fetching occupied seats for a show (500 connections for 15s)
npx autocannon -c 500 -d 15 http://localhost:3001/api/booking/seats/<SHOW_ID>
```

#### 2. Cached vs Non-Cached Routes (Testing Redis Cache Efficiency)
```bash
# Test movie recommendations with 200 users for 10s
npx autocannon -c 200 -d 10 http://localhost:3001/api/recommendations/active_shows
```

#### 3. Protected / Authenticated Routes (Profile, Booking History)
Pass the `Authorization` header with `-H`:
```bash
npx autocannon -c 100 -d 10 \
  -H "Authorization=Bearer <YOUR_JWT_TOKEN>" \
  http://localhost:3001/api/user/profile
```

---

### Method B: Automated Multi-Route Benchmark Script

You can create a standalone script (`backend/scripts/benchmark-all-routes.js`) that benchmarks every major route in sequence and prints an executive summary table:

```javascript
import autocannon from 'autocannon';

const BASE_URL = 'http://localhost:3001';
const DURATION = 10; // 10 seconds per route

const routesToTest = [
  {
    name: 'Health Check (Static/Ping)',
    path: '/',
    method: 'GET',
    connections: 200,
  },
  {
    name: 'Browse Active Shows (Read Route)',
    path: '/api/show/active',
    method: 'GET',
    connections: 200,
  },
  {
    name: 'Fetch Occupied Seats (MongoDB Query)',
    path: '/api/booking/seats/<YOUR_SHOW_ID>',
    method: 'GET',
    connections: 200,
  },
  {
    name: 'AI Chatbot Query (Heavy External LLM)',
    path: '/api/chatbot/message',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Which action movies are available?' }),
    connections: 20, // Lower concurrency due to LLM rate limits
  }
];

async function runBenchmark() {
  console.log('🏁 Starting ShowTime Full-Suite Route Benchmark...\n');
  
  for (const route of routesToTest) {
    console.log(`Testing: ${route.name} (${route.connections} users, ${DURATION}s)...`);
    
    const result = await autocannon({
      url: `${BASE_URL}${route.path}`,
      method: route.method,
      connections: route.connections,
      duration: DURATION,
      headers: route.headers || {},
      body: route.body || undefined,
    });

    console.log(`  -> Req/Sec: ${result.requests.average} req/s`);
    console.log(`  -> Avg Latency: ${result.latency.average} ms`);
    console.log(`  -> p95 Latency: ${result.latency.p95} ms`);
    console.log(`  -> p99 Latency: ${result.latency.p99} ms`);
    console.log(`  -> 2xx: ${result['2xx']} | 4xx: ${result['4xx']} | 5xx: ${result['5xx']}\n`);
  }
}

runBenchmark();
```

---

### Method C: Testing Against the Deployed Production URL (Render)

To test the live Render deployment instead of local:

```bash
npx autocannon -c 50 -d 10 https://itsshowtime-backend.onrender.com/api-docs/
npx autocannon -c 50 -d 10 https://itsshowtime-backend.onrender.com/api/booking/seats/<SHOW_ID>
```

> ⚠️ **Production Testing Tip**: Keep concurrency on Render free tier around **50–100 connections**. Higher concurrency (like 1,000) on a free 0.1 CPU instance will cause CPU throttling, whereas your local machine can easily push thousands of connections.

---

## 📊 6. How to Interpret the Metrics

| Metric | What It Means | Good Production Target |
| :--- | :--- | :--- |
| **Req/Sec (Throughput)** | Total requests handled per second | $> 500\text{ req/s}$ for cached/simple routes |
| **Mean / p50 Latency** | Average time 50% of users experience | $< 50\text{ ms}$ for Redis reads, $< 150\text{ ms}$ for DB reads |
| **p95 / p99 Latency** | Worst-case experience (slowest 5% or 1%) | $< 300\text{ ms}$ (reveals DB lock contention or GC pauses) |
| **Non-2xx / 5xx** | Server errors or dropped packets | **0.00%** |

---

## 🎙️ 7. Technical Interview Talking Points

> *"How did you handle concurrent seat bookings and high traffic in your ticket booking system?"*

### Sample Strong Answer:
> *"In ShowTime, I implemented a two-tier concurrency control mechanism combining Redis distributed locking with atomic MongoDB updates.*
>
> *When concurrent users attempt to book the exact same seat, the backend issues an atomic Redis `SETNX` (`SET key val PX 15000 NX`). Because Redis executes commands on a single-threaded event loop, exactly one request acquires the lock in memory in under 2 milliseconds, while the other concurrent requests are rejected immediately without saturating database connection pools.*
>
> *As a safety net, MongoDB uses a conditional atomic query (`Show.findOneAndUpdate` with `{ "occupiedSeats.<seat>": { $exists: false } }`), which guarantees strict consistency even if a lock expires.*
>
> *I validated this architecture under high load using Autocannon by firing bursts of 500 to 1,000 concurrent booking attempts directly at the same seat. Under high concurrent load, exactly 1 request succeeded (HTTP 201), all other requests were cleanly rejected (HTTP 400), and automated post-test database assertions verified strictly 1 booking was created with a 0% double-booking rate."*

---

## 🔍 8. How to Prove 100% That Real Traffic is Hitting the Backend (Zero Mocking)

When presenting load testing results in interviews or documentation, you must be able to prove that the metrics reflect **real network sockets, genuine HTTP status codes, and persistent database mutations**—not simulated mock data.

Here are **5 concrete, independently verifiable proofs**:

---

### Proof 1: The "Kill Server" Test (Immediate Network Level Proof)
The simplest proof that the test is not mocking in-memory data:
1. Stop your backend server process (`Ctrl + C` in the terminal running `node server.js`).
2. In your test terminal, execute:
   ```bash
   npm run test:concurrency
   ```
3. **Observation:** The test script immediately crashes with:
   ```text
   AggregateError [ECONNREFUSED]: connect ECONNREFUSED 127.0.0.1:3001
   code: 'ECONNREFUSED'
   ```
4. **Why this is conclusive:** If any part of the test were mocked, the script would have passed regardless of server state. The fatal connection error proves that the test strictly depends on a live operating system TCP socket listening on port 3001.

---

### Proof 2: Real Interactive Stripe Checkout Session Generation
For every concurrency batch that runs (50, 100, 500, 1,000), exactly one winning request executes downstream logic:
1. It contacts Stripe's live API (`https://api.stripe.com/v1/checkout/sessions`).
2. It returns a cryptographically signed checkout URL.
3. The test runner outputs this URL directly to your console:
   ```text
   🔎 VERIFIED IN REAL MONGODB:
      - Booking ID  : 68664b3d262e9a5920405712
      - Winning User: loadtest_user_42
      - Stripe URL  : https://checkout.stripe.com/c/pay/cs_test_a16fRIXKRhBB...
   ```
4. **How to verify:** Copy that URL into Google Chrome or Edge. You will see a live Stripe Checkout page displaying the movie title, seat price, and booking metadata generated during that exact millisecond.

---

### Proof 3: Direct MongoDB Mutation & Query Inspection
Do not rely on the script's output alone. Verify database state directly using **MongoDB Compass**, **mongosh**, or the **MongoDB Atlas Web UI**:

#### Check Bookings Collection:
Run this query in your MongoDB shell or Compass filter:
```javascript
// Filter for the 1000-user seat test:
db.bookings.find({ bookedSeats: "T_SEAT_1000" }).pretty();
```
* **Result:** You will find **strictly 1 document**.
* The document will contain:
  * An authentic MongoDB `_id` (`ObjectId`).
  * `user: "loadtest_user_X"` matching the winning request.
  * `createdAt` timestamp matching the exact second you ran the test.
  * `paymentLink` containing the live Stripe URL.

#### Check Shows Collection:
```javascript
// Inspect the occupied seats map of your show:
db.shows.find(
  { "occupiedSeats.T_SEAT_1000": { $exists: true } },
  { occupiedSeats: 1 }
);
```
* **Result:** Only a single user ID is mapped to `T_SEAT_1000`. Double-booking is strictly $0\%$.

---

### Proof 4: Live Telemetry in the Upstash Redis Console
1. Log in to [console.upstash.com](https://console.upstash.com/).
2. Select your active database: `patient-mutt-139703`.
3. Open the **Metrics** / **Analytics** tab and observe the **Commands / Sec** chart.
4. Run `npm run test:concurrency`.
5. **Observation:** You will see a distinct vertical traffic spike representing:
   * 1,000 simultaneous `SETNX` commands.
   * Key deletion / lock-release Lua script evaluations (`EVAL`).
   * Read operations validating lock status.
6. This proves that third-party cloud infrastructure physically received and executed every command over TLS.

---

### Proof 5: Live Server Console Logs & Socket Handling
When running `node server.js` in a visible terminal:
1. Launch `npm run test:concurrency` in a side-by-side terminal.
2. Watch the server terminal handle the incoming burst:
   * 1,000 concurrent HTTP POST requests hit the Express routing pipeline.
   * Redis lock acquisition resolves winning and losing requests in real time.
   * Inngest background event triggers fire for the winning booking.
3. If you intentionally introduce an invalid JWT secret in the test script, the server immediately returns `401 Unauthorized`, proving real middleware validation is executed for every single request.


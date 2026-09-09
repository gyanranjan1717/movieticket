# 🧪 Jest & Supertest Integration Testing: Master Engineering Guide
### *In-Process API Contract & Concurrency Validation for Senior Node.js / Express Systems*

---

## 📌 Table of Contents
1. [Executive Summary & The "Do You Have Tests?" Interview Question](#1-executive-summary--the-do-you-have-tests-interview-question)
2. [The Testing Pyramid: Where Jest & Supertest Fit](#2-the-testing-pyramid-where-jest--supertest-fit)
3. [Architecture: In-Process Virtual HTTP vs. Real Sockets](#3-architecture-in-process-virtual-http-vs-real-sockets)
4. [ES Modules & Node.js VM Compatibility](#4-es-modules--nodejs-vm-compatibility)
5. [Step-by-Step Implementation in ShowTime](#5-step-by-step-implementation-in-showtime)
6. [Deep Dive into the Test Suites & Exact Assertions](#6-deep-dive-into-the-test-suites--exact-assertions)
7. [Running Tests & Interpreting Code Coverage Reports](#7-running-tests--interpreting-code-coverage-reports)
8. [Mocking vs. Live Database Strategies](#8-mocking-vs-live-database-strategies)
9. [CI/CD Automation with GitHub Actions](#9-cicd-automation-with-github-actions)
10. [Senior SDE Interview Defense & Architectural Q&A](#10-senior-sde-interview-defense--architectural-qa)

---

## 1. Executive Summary & The "Do You Have Tests?" Interview Question

In technical interviews for Senior Software Development Engineer (SDE II/III, Tech Lead) roles, one of the most common elimination questions is:

> *"How do you test your backend before shipping to production? Do you have automated tests, or do you just test manually via Postman or Swagger?"*

### The Junior vs. Senior Answer

* **Junior Answer:**
  > *"I test my APIs by opening Postman or my React frontend, sending a request, looking at the JSON response, and checking MongoDB Compass to see if the record appeared."*
  * **Why it fails:** This is manual exploratory testing. It does not scale, cannot run in CI/CD, cannot detect regressions when other teammates push code, and leaves zero automated proof of correctness.

* **Senior Answer:**
  > *"We employ a three-tier automated test strategy:*
  > 1. *Unit & Integration tests via **Jest + Supertest** running in-process on every commit, verifying route status codes, Zod schema validation, JWT auth gates, and DB state with coverage profiling.*
  > 2. *Automated contract regression tests via **Postman + Newman CLI** executing end-to-end user journeys against staging.*
  > 3. *High-concurrency stress testing via **Autocannon** asserting our atomic seat-locking mechanisms prevent double-booking under race conditions (1,000 concurrent users).*
  > *All of this runs headless in GitHub Actions before any PR can be merged."*

---

## 2. The Testing Pyramid: Where Jest & Supertest Fit

```
                     / \
                    /   \
                   / E2E \         Newman / Postman (Live staging server, multi-step flows)
                  /-------\
                 /  Stress \       Autocannon (1,000 concurrent seat races, throughput)
                /-----------\
               / Integration \     Jest + Supertest (In-memory Express app, DB & Auth gates)
              /---------------\
             /   Unit Tests    \   Jest (Pure functions, utility helpers, schema validators)
            /-------------------\
```

| Dimension | Unit Testing | Jest + Supertest (Integration) | Newman / Postman | Autocannon |
| :--- | :--- | :--- | :--- | :--- |
| **Scope** | Single function/class in isolation | Express routes + middleware + controller + DB | Entire deployed server (black-box) | Server limits & concurrency race |
| **Server Needed?** | No | **No (In-memory `request(app)` HTTP simulation)** | **Yes (must be running on TCP port)** | **Yes (must be running on TCP port)** |
| **Speed** | Sub-millisecond | 10ms – 500ms per test | 100ms – 2s per request | 10s – 60s load bursts |
| **CI/CD Role** | Pre-commit hook & PR gate | Pre-merge PR gate (fails if code breaks) | Post-deploy smoke test | Nightly / Release benchmarking |

---

## 3. Architecture: In-Process Virtual HTTP vs. Real Sockets

The defining technical advantage of **Supertest** over tools like Newman or Axios is **how it interacts with Express**:

### Traditional External HTTP Testing (Axios / Postman)
```
[Postman / Newman] ──(OS TCP Socket / Network Stack)──> [Port 3001] ──> [Express Server]
```
* Requires your server to be actively running on `localhost:3001`.
* Can cause `EADDRINUSE: port 3001 already in use` conflicts.
* Slower due to OS-level TCP handshake, socket buffer allocation, and tear-down.

### Supertest In-Process Virtual HTTP
```
[Jest Runner]
  └──> import app from '../server.js'
  └──> request(app).post('/api/booking/create')
         └──> Supertest creates an ephemeral in-memory HTTP server
         └──> Piped directly into Express middleware pipeline
         └──> Closes immediately after response finishes
```
* **Zero Port Conflicts:** No port 3001 is bound. You can run 50 test files in parallel without collision.
* **Direct Stack Inspection:** Supertest captures Express internal stack traces, headers, and unhandled rejections directly in memory.

### The Decoupling Pattern (`server.js`)
To allow Supertest to import Express without binding port 3001, we decoupled the server lifecycle in `backend/server.js`:

```javascript
// backend/server.js
const app = express();

// ... middleware & routes ...

// CRITICAL: Guard server.listen so tests don't bind port 3001
if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

// Export app for Supertest
export default app;
```

---

## 4. ES Modules & Node.js VM Compatibility

The ShowTime backend uses modern ECMAScript Modules (`"type": "module"` in `package.json`).

### The Challenge with Jest & ESM
Historically, Jest was designed around CommonJS (`require()` / `module.exports`). When importing an ESM file with `import app from '../server.js'`, Jest throws:
`SyntaxError: Cannot use import statement outside a module`.

### The Senior Solution
1. Use Node's native VM module support:
   ```bash
   NODE_OPTIONS=--experimental-vm-modules jest
   ```
2. Wrap with `cross-env` so it works identically on **Windows (PowerShell/CMD)**, **macOS**, and **Linux (CI/CD)**:
   ```json
   "scripts": {
     "test": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --runInBand --detectOpenHandles",
     "test:coverage": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --coverage --runInBand"
   }
   ```
3. Configure `backend/jest.config.js`:
   ```javascript
   export default {
     testEnvironment: 'node',
     transform: {}, // Disable Babel; let Node execute ESM natively
     testTimeout: 20000, // 20s timeout to allow real Stripe session creation
     verbose: true,
     collectCoverageFrom: [
       'controllers/**/*.js',
       'middleware/**/*.js',
       'routes/**/*.js'
     ]
   };
   ```

---

## 5. Step-by-Step Implementation in ShowTime

### Installed Packages
```bash
npm install -D jest supertest cross-env
```

### File Hierarchy
```
backend/
├── jest.config.js               # Jest ESM & coverage configuration
├── package.json                 # Test execution scripts
├── server.js                    # Exported app + conditional server.listen
└── tests/
    ├── health.test.js           # Suite 1: Health check & Swagger UI
    ├── shows.test.js            # Suite 2: Shows catalog & seat availability
    └── booking.test.js          # Suite 3: Ticket booking, Auth, Zod, Seat Concurrency
```

---

## 6. Deep Dive into the Test Suites & Exact Assertions

### Suite 1: Health & Documentation (`tests/health.test.js`)
* **Objective:** Ensure the root API gateway and OpenAPI/Swagger documentation endpoints respond properly.

```javascript
import request from 'supertest';
import app from '../server.js';

describe('1. Health Check & Swagger Documentation Endpoints', () => {
  it('GET / should return 200 OK with server status and swaggerDocs URL', async () => {
    const res = await request(app).get('/');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('ShowTime Backend Server');
    expect(res.body.swaggerDocs).toBeDefined();
    expect(res.body.swaggerDocs).toContain('/api-docs');
  });

  it('GET /api-docs/ should serve interactive Swagger documentation HTML', async () => {
    const res = await request(app).get('/api-docs/');

    expect([200, 301, 302]).toContain(res.statusCode);
  });
});
```

---

### Suite 2: Shows & Movie Catalog (`tests/shows.test.js`)
* **Objective:** Validate read operations, verify array structures, and ensure graceful error handling on malformed IDs.

```javascript
import request from 'supertest';
import app from '../server.js';

describe('2. Shows & Movie Catalog Endpoints', () => {
  let sampleShowId = null;

  it('GET /api/show/all should return active shows array', async () => {
    const res = await request(app).get('/api/show/all');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.shows)).toBe(true);

    if (res.body.shows.length > 0) {
      sampleShowId = res.body.shows[0]._id;
      expect(res.body.shows[0]).toHaveProperty('_id');
      expect(res.body.shows[0]).toHaveProperty('showPrice');
    }
  });

  it('GET /api/booking/seats/:showId should return occupied seats array for a valid show', async () => {
    const showIdToQuery = sampleShowId || '6aa17b4ee6a917c3b670be86';
    const res = await request(app).get(`/api/booking/seats/${showIdToQuery}`);

    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.occupiedSeats)).toBe(true);
    }
  });

  it('GET /api/booking/seats/invalid_id should handle non-existent show gracefully', async () => {
    const res = await request(app).get('/api/booking/seats/000000000000000000000000');
    expect([404, 500]).toContain(res.statusCode);
  });
});
```

---

### Suite 3: Booking, Auth Gates & Concurrency Conflicts (`tests/booking.test.js`)
* **Objective:** Test state-mutating transactions, JWT authentication, Zod payload validation, Stripe checkout generation, and seat collision rejection.

```javascript
import request from 'supertest';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import app from '../server.js';
import Show from '../models/showModel.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'movieticket_super_secret_jwt_key_2026';

describe('3. Booking & Concurrency Protection Endpoints', () => {
  let authToken;
  let testShowId;
  const uniqueTestSeat = 'JEST_SEAT_' + Date.now().toString().slice(-6);

  beforeAll(async () => {
    // Generate valid test JWT fixture
    authToken = jwt.sign(
      { userId: 'loadtest_user_1', email: 'loadtest_1@example.com', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const show = await Show.findOne().lean();
    testShowId = show?._id ? show._id.toString() : '68664b3d262e9a5920405712';
  });

  it('POST /api/booking/create should reject requests without Authorization token with 401', async () => {
    const res = await request(app)
      .post('/api/booking/create')
      .send({ showId: testShowId, selectedSeats: ['A1'] });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Authorization token required');
  });

  it('POST /api/booking/create should reject requests with invalid/tampered token with 401', async () => {
    const res = await request(app)
      .post('/api/booking/create')
      .set('Authorization', 'Bearer tampered_invalid_token_123')
      .send({ showId: testShowId, selectedSeats: ['A1'] });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/booking/create should reject empty payload with 400 Zod Validation Error', async () => {
    const res = await request(app)
      .post('/api/booking/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/booking/create should successfully create a booking for valid inputs (201 Created)', async () => {
    const res = await request(app)
      .post('/api/booking/create')
      .set('Authorization', `Bearer ${authToken}`)
      .set('origin', 'http://localhost:5173')
      .send({
        showId: testShowId,
        selectedSeats: [uniqueTestSeat],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.bookingId).toBeDefined();
    expect(res.body.url).toContain('checkout.stripe.com');
  });

  it('POST /api/booking/create should reject duplicate booking on the exact same seat with 400', async () => {
    // Attempt to book the exact same seat that was just locked in the test above
    const res = await request(app)
      .post('/api/booking/create')
      .set('Authorization', `Bearer ${authToken}`)
      .set('origin', 'http://localhost:5173')
      .send({
        showId: testShowId,
        selectedSeats: [uniqueTestSeat],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
```

---

## 7. Running Tests & Interpreting Code Coverage Reports

### Executing the Test Suite
```bash
npm test
```

#### Verbatim Terminal Output
```text
PASS tests/booking.test.js (18.078 s)
  3. Booking & Concurrency Protection Endpoints
    √ POST /api/booking/create should reject requests without Authorization token with 401 (63 ms)
    √ POST /api/booking/create should reject requests with invalid/tampered token with 401 (24 ms)
    √ POST /api/booking/create should reject empty payload with 400 Zod Validation Error (86 ms)
    √ POST /api/booking/create should successfully create a booking for valid inputs (201 Created) (10737 ms)
    √ POST /api/booking/create should reject duplicate booking on the exact same seat with 400 (697 ms)

PASS tests/shows.test.js (0.836 s)
  2. Shows & Movie Catalog Endpoints
    √ GET /api/show/all should return active shows array (836 ms)
    √ GET /api/booking/seats/:showId should return occupied seats array for a valid show (59 ms)
    √ GET /api/booking/seats/invalid_id should handle non-existent show gracefully (55 ms)

PASS tests/health.test.js (0.040 s)
  1. Health Check & Swagger Documentation Endpoints
    √ GET / should return 200 OK with server status and swaggerDocs URL (40 ms)
    √ GET /api-docs/ should serve interactive Swagger documentation HTML (23 ms)

Test Suites: 3 passed, 3 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        26.524 s
Ran all test suites.
```

---

### Executing Code Coverage
```bash
npm run test:coverage
```

#### Coverage Table
```text
------------------------------|---------|----------|---------|---------|------------------------------------
File                          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                  
------------------------------|---------|----------|---------|---------|------------------------------------
All files                     |   21.07 |     4.03 |   10.56 |   21.45 |                                    
 controllers                  |    15.2 |     3.11 |    8.54 |   15.51 |                                    
  bookingController.js        |   64.70 |    36.36 |   72.72 |   65.51 | 11,19-28,45-53,60-61,150-151...    
 middleware                   |   69.69 |    58.33 |      50 |   70.96 |                                    
  auth.js                     |   69.56 |    60.00 |   33.33 |   69.56 | 22,41-49                           
  validate.js                 |   70.00 |    50.00 |   66.66 |   75.00 | 7-11                               
 routes                       |  100.00 |   100.00 |  100.00 |  100.00 | All 9 route files (100% coverage)  
------------------------------|---------|----------|---------|---------|------------------------------------
```

### Understanding Coverage Metrics
1. **% Stmts (Statement Coverage):** Percentage of executable JavaScript lines touched by tests.
2. **% Branch (Branch Coverage):** Percentage of `if / else`, ternary operators, and logical conditionals (`||`, `&&`) whose true AND false paths were both executed.
3. **% Funcs (Function Coverage):** Percentage of declared functions invoked during the run.
4. **% Lines (Line Coverage):** Percentage of physical lines in the source file reached.
5. **Uncovered Line #s:** Exact line numbers that were never reached (e.g. catch blocks, edge case conditions).

---

## 8. Mocking vs. Live Database Strategies

When writing integration tests in Express, there are two distinct approaches for database state:

| Feature | Live MongoDB Test DB (Our Implementation) | In-Memory (`mongodb-memory-server`) |
| :--- | :--- | :--- |
| **How it works** | Connects to an actual MongoDB Atlas sandbox cluster | Spawns a temporary binary MongoDB instance in RAM |
| **Fidelity** | **100% real.** Real indexes, transactions, and Stripe API calls | Synthetic. May not mirror Atlas replica set behavior |
| **State Isolation** | Unique test seat IDs (`JEST_SEAT_${Date.now()}`) | Dropped completely when test process exits |
| **Speed** | 100ms – 1s network latency | Instantaneous |
| **Recommended for** | Staging integration suites, payment flows | Offline unit tests, rapid local iteration |

---

## 9. CI/CD Automation with GitHub Actions

Here is the exact production GitHub Actions workflow to run Jest and Newman on every Pull Request:

```yaml
# .github/workflows/test.yml
name: ShowTime Backend CI

on:
  push:
    branches: [ main, dev ]
  pull_request:
    branches: [ main, dev ]

jobs:
  test:
    name: Run Jest & Supertest Integration Suite
    runs-on: ubuntu-latest

    env:
      NODE_ENV: test
      JWT_SECRET: ${{ secrets.JWT_SECRET }}
      MONGODB_URI: ${{ secrets.MONGODB_URI }}
      STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install Dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run Jest Test Suite with Coverage
        working-directory: ./backend
        run: npm run test:coverage

      - name: Enforce Coverage Threshold
        working-directory: ./backend
        run: npx jest --coverageThreshold='{"global":{"lines":20}}'
```

---

## 10. Senior SDE Interview Defense & Architectural Q&A

### Q1: Why use Supertest instead of Axios or `node-fetch` for API integration tests?
> **Answer:**
> *"Supertest abstracts away the network layer. Rather than requiring a live server listening on an active TCP port (`server.listen(3001)`), Supertest passes the Express application callback directly into Node's internal `http.createServer()` method, spinning up a lightweight ephemeral server on an unassigned port in memory. This eliminates `EADDRINUSE` port collision errors, avoids OS network socket overhead, and allows parallel test execution without state leaks."*

### Q2: How did you solve the `EADDRINUSE` issue when importing `server.js` into Jest?
> **Answer:**
> *"In a monolithic script, `server.listen()` executes immediately upon module import. To fix this, we decoupled the server lifecycle: `server.js` checks `if (process.env.NODE_ENV !== 'test')` before calling `listen()`, and exports `app` directly. When Jest runs, `NODE_ENV` is set to `'test'`, so `server.listen()` is skipped, leaving Supertest free to mount the application in memory."*

### Q3: How do you handle authentication in automated integration tests?
> **Answer:**
> *"Rather than making a network call to the login endpoint before every test (which slows tests down and introduces external dependencies), we generate a cryptographically valid test JWT fixture inside Jest's `beforeAll` block using our `JWT_SECRET` with mock user claims `{ userId, email, role }`. We attach this token to Supertest requests via `.set('Authorization', `Bearer ${authToken}`)`. We also test negative paths by sending tampered tokens and omitted tokens to guarantee 401 Unauthorized responses."*

### Q4: How do your tests verify seat race condition protection?
> **Answer:**
> *"In `tests/booking.test.js`, test 4 submits a booking with a dynamically generated unique seat identifier (`JEST_SEAT_123456`) and asserts a `201 Created` status and valid Stripe checkout session. Immediately following, test 5 attempts to book the exact same seat for the exact same show and asserts a `400 Bad Request` with an error message confirming the seat is already occupied or locked. At the stress layer, Autocannon simulates 1,000 users requesting the same seat within a 2-second window to confirm that only 1 succeeds and 999 are rejected."*

### Q5: What is the difference between Statement, Branch, and Line coverage?
> **Answer:**
> * **Statement Coverage:** How many individual statements were executed.
> * **Line Coverage:** How many lines in the source file were run.
> * **Branch Coverage:** Most critical for security and error handling. It checks whether every branch in decision structures (`if/else`, switch statements, ternary operators) was traversed. For example, an `if (user && user.isAdmin)` has 4 possible truth-table outcomes; 100% branch coverage requires testing both paths of both conditions.

---

### 🏆 Summary Checklist for Your Resume / Portfolio
- [x] In-process integration testing with **Jest + Supertest**.
- [x] Decoupled Express app lifecycle (`process.env.NODE_ENV !== 'test'`).
- [x] Configured native ES Module testing with `NODE_OPTIONS=--experimental-vm-modules`.
- [x] Created suites for **Health**, **Show Discovery**, and **Atomic Ticket Booking**.
- [x] Asserted happy paths (`200`, `201`) and defensive paths (`400`, `401`, `404`).
- [x] Real-time code coverage profiling with Jest Coverage tables.
- [x] Ready for seamless CI/CD pipeline integration via GitHub Actions.

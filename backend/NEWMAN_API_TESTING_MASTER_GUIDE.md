# 📘 ShowTime API Testing & Newman CI/CD Master Guide
### *The Definitive Reference for Automated API Contract Testing, Dynamic Request Chaining, and Enterprise Regression Pipelines*

---

## 📑 Table of Contents
1. [Executive Overview & Testing Philosophy](#1-executive-overview--testing-philosophy)
2. [Postman & Newman Architecture Deep Dive](#2-postman--newman-architecture-deep-dive)
3. [The Postman Sandbox & Scripting API (`pm.*`)](#3-the-postman-sandbox--scripting-api-pm)
4. [Variable Scoping & Dynamic Data Chaining](#4-variable-scoping--dynamic-data-chaining)
5. [Complete ShowTime API Suite: Inputs, Outputs & Assertions](#5-complete-showtime-api-suite-inputs-outputs--assertions)
6. [Running Headlessly via Newman CLI](#6-running-headlessly-via-newman-cli)
7. [Enterprise CI/CD Pipeline Integration (GitHub Actions)](#7-enterprise-cicd-pipeline-integration-github-actions)
8. [Data-Driven Testing with CSV/JSON Payloads](#8-data-driven-testing-with-csvjson-payloads)
9. [Senior Interview Q&A: Architectural & System Design Defense](#9-senior-interview-qa-architectural--system-design-defense)

---

## 1. Executive Overview & Testing Philosophy

### The Evolution of API Quality Assurance
```
Level 0: Manual Exploration (cURL / Eyeballing Postman)
   │  "I hit Send and glance at the JSON to see if it looks right."
   ▼
Level 1: Automated Assertions (Postman pm.test)
   │  "The collection checks status codes, data types, and contract keys automatically."
   ▼
Level 2: Headless Command-Line Execution (Newman)
   │  "The test suite runs headlessly in terminal, returning exit code 0 or 1."
   ▼
Level 3: Automated CI/CD Regression Gate (GitHub Actions)
   │  "Tests run on every pull request. Broken contracts block production deployment."
```

### Why Senior Developers Care About Automated API Contracts
* **Zero Defect Escape**: Unit tests verify functions in isolation; end-to-end API tests verify that the HTTP routing, middleware, database connection, and third-party gateways (e.g. Stripe, Redis) actually cooperate.
* **Contract Drift Prevention**: Microservices and frontend applications break when backend payloads silently alter keys (e.g., changing `bookingId` to `id`). Automated contract assertions catch drift before merge.
* **Rapid Refactoring Confidence**: When migrating from callbacks to `async/await`, upgrading Mongoose versions, or restructuring database schemas, a 5-second Newman run validates the entire system.

---

## 2. Postman & Newman Architecture Deep Dive

### How Postman & Newman Relate
* **Postman**: The graphical IDE used to design requests, author test scripts, and debug payloads.
* **Newman**: Postman’s official **headless CLI execution engine**. Newman parses the Postman Collection v2.1 JSON file, executes HTTP requests using Node’s native network stack, runs the embedded JavaScript sandbox, and generates machine-readable pass/fail reports.

### Collection Schema v2.1 Structure
A Postman Collection is a strictly validated JSON file conforming to the [Postman Collection Format](https://schema.getpostman.com/json/collection/v2.1.0/collection.json):

```
Collection JSON
├── info (name, schema, description)
├── item[] (Requests & Folders)
│    ├── name
│    ├── request (method, headers, body, url)
│    └── event[]
│         ├── "prerequest" (executes BEFORE HTTP call)
│         └── "test" (executes AFTER HTTP call)
└── variable[] (Collection-level variables)
```

### The Request Lifecycle
```
[Start Request]
       │
       ▼
[Pre-request Script] ───► Calculates signatures, seeds dynamic variables
       │
       ▼
[HTTP Request Dispatched over TCP/TLS]
       │
       ▼
[HTTP Response Received (Status, Headers, Body, Latency)]
       │
       ▼
[Tests Script Executes in Node.js VM Sandbox]
       │
       ▼
[pm.test() Assertions Evaluated ──► Passed (✔) or Failed (✘)]
       │
       ▼
[Environment & Collection Variables Updated for Next Request]
```

---

## 3. The Postman Sandbox & Scripting API (`pm.*`)

The Postman sandbox provides a isolated Node.js virtual machine with pre-imported utility libraries:
* **Chai.js**: BDD assertion library (`pm.expect(...)`).
* **Lodash (`_`)**: Data transformation utilities.
* **CryptoJS**: Hash generation (MD5, SHA256, HMAC).
* **ajv / tv4**: JSON Schema validators.

### Essential Assertion Patterns

#### 1. Status Code Validation
```javascript
pm.test("Status code is 201 Created", function () {
    pm.response.to.have.status(201);
});
pm.test("Status code is one of 200, 201", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});
```

#### 2. Deep Schema & Type Checking
```javascript
pm.test("Response contract is valid", function () {
    const json = pm.response.json();
    pm.expect(json).to.be.an("object");
    pm.expect(json.success).to.be.a("boolean").and.to.eql(true);
    pm.expect(json.bookingId).to.be.a("string").and.to.have.lengthOf(24);
    pm.expect(json.bookedSeats).to.be.an("array").that.includes("A1");
});
```

#### 3. Latency & Performance SLA Verification
```javascript
pm.test("Redis cache SLA: response under 150ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(150);
});
```

#### 4. Header & Security Assertions
```javascript
pm.test("Security headers enforced", function () {
    pm.response.to.have.header("Content-Type");
    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});
```

---

## 4. Variable Scoping & Dynamic Data Chaining

### The 5 Variable Scopes (Narrowest to Broadest)
1. **Data Variables**: Injected from CSV/JSON during Newman batch runs.
2. **Local Variables**: Set inside a script with `pm.variables.set()`, alive only during that single request.
3. **Environment Variables**: Context-specific (e.g. `Local`, `Staging`, `Production`).
4. **Collection Variables**: Bundled inside the collection JSON, portable across users.
5. **Global Variables**: Shared across all collections in a workspace.

### Dynamic Request Chaining (The Antidote to Hardcoding)
In our ShowTime suite, **Request 2** discovers active shows and dynamically passes the ID to **Request 3 and 4**:

```javascript
// Inside Request 2: "Discover Active Shows" Tests Tab:
const json = pm.response.json();

if (json.shows && json.shows.length > 0) {
    const activeShow = json.shows[0];
    
    // Dynamically store variables in the active environment
    pm.environment.set("showId", activeShow._id);
    pm.environment.set("testSeat", "SEAT_" + Date.now().toString().slice(-6));
}
```

Now, **Request 4: Create Booking** uses:
* URL: `{{baseUrl}}/api/booking/create`
* Body: `{ "showId": "{{showId}}", "selectedSeats": ["{{testSeat}}"] }`

Zero manual copy-pasting required. Tests are completely resilient to database resets.

---

## 5. Complete ShowTime API Suite: Inputs, Outputs & Assertions

Here is the exact contract specification for the 8 automated requests in `backend/tests/ShowTime-API-Tests.postman_collection.json`:

### Request 1: System Health & Swagger Contract
* **Method & URL**: `GET {{baseUrl}}/`
* **Purpose**: Verify backend uptime, WebSocket initialization, and Swagger documentation availability.
* **Input Payload**: None
* **Sample Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "ShowTime Backend Server is running smoothly with WebSockets & Helmet Security",
    "swaggerDocs": "http://localhost:3001/api-docs"
  }
  ```
* **Assertions**:
  1. `pm.response.to.have.status(200)`
  2. `pm.expect(json.swaggerDocs).to.include('/api-docs')`
  3. `pm.expect(pm.response.responseTime).to.be.below(300)`

---

### Request 2: Discover Active Shows (Dynamic Chaining)
* **Method & URL**: `GET {{baseUrl}}/api/show/all`
* **Purpose**: Query upcoming screenings and dynamically extract a valid `showId`.
* **Input Payload**: None
* **Sample Response (200 OK)**:
  ```json
  {
    "success": true,
    "shows": [
      {
        "_id": "6aa17b4ee6a917c3b670be86",
        "movie": { "title": "Kelsey Cook: Happy Hour", "vote_average": 8.5 },
        "showDateTime": "2026-07-04T18:30:00.000Z",
        "showPrice": 200
      }
    ],
    "cached": false
  }
  ```
* **Assertions**:
  1. `pm.response.to.have.status(200)`
  2. `pm.expect(json.shows).to.be.an('array').and.not.empty`
  3. Chaining: `pm.environment.set('showId', json.shows[0]._id)`

---

### Request 3: Query Occupied Seats for Show
* **Method & URL**: `GET {{baseUrl}}/api/booking/seats/{{showId}}`
* **Purpose**: Ensure the seat layout endpoint returns occupied seat identifiers.
* **Sample Response (200 OK)**:
  ```json
  {
    "success": true,
    "occupiedSeats": ["A1", "A2", "T_SEAT_50"]
  }
  ```
* **Assertions**:
  1. `pm.response.to.have.status(200)`
  2. `pm.expect(json.occupiedSeats).to.be.an('array')`

---

### Request 4: Create Booking — Happy Path
* **Method & URL**: `POST {{baseUrl}}/api/booking/create`
* **Headers**:
  * `Authorization`: `Bearer {{authToken}}`
  * `Content-Type`: `application/json`
  * `origin`: `http://localhost:5173`
* **Body**:
  ```json
  {
    "showId": "{{showId}}",
    "selectedSeats": ["{{testSeat}}"]
  }
  ```
* **Sample Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Booking created & seats reserved",
    "bookingId": "6aa19b73b5ab29a5fcefd120",
    "amount": 200,
    "url": "https://checkout.stripe.com/c/pay/cs_test_a1PMMg0WobYmo5PdvbCCN..."
  }
  ```
* **Assertions**:
  1. `pm.response.to.have.status(201)`
  2. `pm.expect(json.bookingId).to.be.a('string')`
  3. `pm.expect(json.url).to.include('checkout.stripe.com')`
  4. Response time $< 8000\text{ ms}$ (Stripe TLS round-trip allowance).

---

### Request 5: Negative Test — Reject Duplicate / Locked Seat
* **Method & URL**: `POST {{baseUrl}}/api/booking/create` (Exact same payload immediately fired)
* **Purpose**: Verify Redis `SETNX` distributed lock and MongoDB conditional guard block double-booking.
* **Sample Response (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "Selected seats are not available."
  }
  ```
* **Assertions**:
  1. `pm.response.to.have.status(400)`
  2. `pm.expect(json.success).to.eql(false)`
  3. Immediate lock rejection in $< 600\text{ ms}$.

---

### Request 6: Negative Test — Reject Invalid Auth Token
* **Method & URL**: `POST {{baseUrl}}/api/booking/create`
* **Header**: `Authorization: Bearer invalid_tampered_token_xyz`
* **Sample Response (401 Unauthorized)**:
  ```json
  {
    "success": false,
    "message": "Invalid or expired token"
  }
  ```
* **Assertions**:
  1. `pm.response.to.have.status(401)`
  2. `pm.expect(json.success).to.eql(false)`

---

### Request 7: Negative Test — Reject Invalid Zod Schema (Empty Body)
* **Method & URL**: `POST {{baseUrl}}/api/booking/create`
* **Body**: `{}`
* **Sample Response (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "Validation Error",
    "errors": [
      { "field": "showId", "message": "Show ID is required" },
      { "field": "selectedSeats", "message": "At least one seat must be selected" }
    ]
  }
  ```
* **Assertions**:
  1. `pm.response.to.have.status(400)`
  2. `pm.expect(json.success).to.eql(false)`

---

### Request 8: Recommendations Performance & Auth
* **Method & URL**: `GET {{baseUrl}}/api/recommendations`
* **Header**: `Authorization: Bearer {{authToken}}`
* **Sample Response (200 OK)**:
  ```json
  {
    "success": true,
    "recommendations": [
      { "title": "Inception", "matchPercentage": "94% match" }
    ]
  }
  ```
* **Assertions**:
  1. `pm.response.to.have.status(200)`
  2. `pm.expect(json.recommendations).to.be.an('array')`

---

## 6. Running Headlessly via Newman CLI

### Execution Command
```bash
npm run test:api
```
*(Under the hood, this runs: `newman run tests/ShowTime-API-Tests.postman_collection.json -e tests/ShowTime-Local.postman_environment.json`)*

### Actual Terminal Execution Output:
```text
ShowTime API Regression Suite

→ 1. System Health & Swagger Contract
  GET http://localhost:3001/ [200 OK, 1.06kB, 28ms]
  √  Status code is 200 OK
  √  Response contains valid Swagger docs link
  √  Health check latency is under 300ms

→ 2. Discover Active Shows (Dynamic Chaining)
  GET http://localhost:3001/api/show/all [200 OK, 5.93kB, 319ms]
  √  Status code is 200 OK
  √  Active shows array is populated

→ 3. Query Occupied Seats for Show
  GET http://localhost:3001/api/booking/seats/6aa17b4ee6a917c3b670be86 [200 OK, 959B, 37ms]
  √  Status code is 200 OK
  √  Occupied seats list is an array

→ 4. Create Booking — Happy Path
  POST http://localhost:3001/api/booking/create [201 Created, 1.56kB, 5.1s]
  √  Status code is 201 Created
  √  Booking confirmed and Stripe session created
  √  Downstream payment creation latency under 8000ms

→ 5. Negative Test — Reject Duplicate / Locked Seat
  POST http://localhost:3001/api/booking/create [400 Bad Request, 1.03kB, 382ms]
  √  Duplicate seat booking returns HTTP 400 Bad Request
  √  Success flag is false on conflict
  √  Immediate lock rejection in under 600ms

→ 6. Negative Test — Reject Invalid Auth Token
  POST http://localhost:3001/api/booking/create [401 Unauthorized, 1.02kB, 3ms]
  √  Invalid JWT token returns HTTP 401 Unauthorized
  √  Rejection body states invalid or expired token

→ 7. Negative Test — Reject Invalid Zod Schema (Empty Body)
  POST http://localhost:3001/api/booking/create [400 Bad Request, 1.02kB, 64ms]
  √  Schema violation returns HTTP 400 Bad Request
  √  Validation error message present

→ 8. Recommendations Performance & Auth
  GET http://localhost:3001/api/recommendations [200 OK, 10.24kB, 434ms]
  √  Status code is 200 OK
  √  Recommendations array returned

┌─────────────────────────┬────────────────────┬───────────────────┐
│                         │           executed │            failed │
├─────────────────────────┼────────────────────┼───────────────────┤
│              iterations │                  1 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│                requests │                  8 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│            test-scripts │                  8 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│              assertions │                 19 │                 0 │
├─────────────────────────┴────────────────────┴───────────────────┤
│ total run duration: 7s                                           │
└──────────────────────────────────────────────────────────────────┘
```

### Essential Newman CLI Flags
| Flag | Description | Example Usage |
| :--- | :--- | :--- |
| `-e <env_file>` | Specify environment variable JSON file | `newman run coll.json -e env.json` |
| `--bail` | Fail-fast: Abort entire run on the first failed assertion | `newman run coll.json --bail` |
| `--iteration-data` | Pass CSV or JSON dataset for data-driven testing | `newman run coll.json -d testdata.json` |
| `-r cli,htmlextra` | Generate an interactive HTML dashboard report | `npm i -g newman-reporter-htmlextra` |
| `--delay-request <ms>` | Add delay between requests to respect rate limits | `newman run coll.json --delay-request 200` |
| `--timeout-request <ms>`| Per-request network timeout | `newman run coll.json --timeout-request 5000` |

---

## 7. Enterprise CI/CD Pipeline Integration (GitHub Actions)

To automatically run this suite on every Pull Request or Git Push, add this workflow at `.github/workflows/api-tests.yml`:

```yaml
name: API Regression Suite (Newman)

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  api-regression:
    name: Run Newman API Tests
    runs-on: ubuntu-latest

    services:
      # Optional: Spin up local Redis for CI testing
      redis:
        image: redis:alpine
        ports:
          - 6379:6379

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
        run: |
          cd backend
          npm ci

      - name: Start Backend Server
        run: |
          cd backend
          node server.js &
          # Wait for server to bind port 3001
          npx wait-on http://localhost:3001/ --timeout 30000
        env:
          PORT: 3001
          MONGODB_URI: ${{ secrets.CI_MONGODB_URI }}
          REDIS_URL: ${{ secrets.CI_REDIS_URL }}
          JWT_SECRET: "ci_testing_super_secret_jwt_key_2026"
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}

      - name: Run Newman Test Collection
        run: |
          cd backend
          npx newman run tests/ShowTime-API-Tests.postman_collection.json \
            -e tests/ShowTime-Local.postman_environment.json \
            --bail
```

---

## 8. Data-Driven Testing with CSV/JSON Payloads

When testing authentication boundaries or input sanitization, don't write 50 separate requests. Use **Data-Driven Testing**.

### Create `users-dataset.json`:
```json
[
  { "email": "valid@example.com", "expectedStatus": 200 },
  { "email": "missing-domain", "expectedStatus": 400 },
  { "email": "sql-injection'; DROP TABLE users;--", "expectedStatus": 400 },
  { "email": "", "expectedStatus": 400 }
]
```

### In Postman Request:
* Body: `{ "email": "{{email}}" }`
* Test:
  ```javascript
  pm.test("Status code is " + pm.iterationData.get("expectedStatus"), function () {
      pm.response.to.have.status(pm.iterationData.get("expectedStatus"));
  });
  ```

### Run with Newman:
```bash
newman run collection.json -d users-dataset.json
```
Newman will automatically iterate 4 times, testing every single edge case in one execution!

---

## 9. Senior Interview Q&A: Architectural & System Design Defense

### Q1: "How do you distinguish between Unit Testing, Integration Testing, and Postman/Newman Testing?"
> **Answer**:
> *"Unit tests (e.g. Jest) test functions in memory by mocking dependencies. Integration tests test how two components interact (like Mongoose with MongoDB).*
> 
> *Postman/Newman operates at the **End-to-End System Boundary**. It sends real TCP HTTP requests across the network, traversing helmet security, CORS policies, JWT authentication middleware, Zod schema parsers, Redis distributed locks, MongoDB transactions, and third-party payment APIs like Stripe. Newman guarantees that the entire software stack functions cohesively as a production system."*

---

### Q2: "How do you prevent API tests from being flaky when third-party services (like Stripe or Email) are involved?"
> **Answer**:
> *"Flakiness usually happens for three reasons:*
> 1. *Network timeouts: We set appropriate latency thresholds (e.g. 8000ms for third-party Stripe sessions vs 300ms for Redis-backed routes).*
> 2. *Hardcoded test state: We use dynamic chaining (Request 2 finds whatever show is currently active in the database and generates a unique timestamped seat `SEAT_123456`), so tests never fail due to leftover state.*
> 3. *In dedicated CI environments, we can mock external payment gateways or toggle a test-mode bypass, while running live integration tests in staging."*

---

### Q3: "What is the difference between testing with Autocannon vs testing with Newman?"
> **Answer**:
> *"They solve two distinct, complementary engineering concerns:*
> * **Autocannon is for Concurrency & Load Stress**: It fires 500 to 1,000 requests in parallel at the same millisecond to test race conditions, connection pool limits, and distributed locking atomicity.
> * **Newman is for Contract & Functional Regression**: It runs sequentially or in controlled workflows, verifying that response schemas, authorization rules, negative boundaries, and JSON keys strictly comply with business specifications."*

---

### Q4: "How does Newman fit into an Enterprise CI/CD strategy?"
> **Answer**:
> *"Newman acts as an automated deployment gatekeeper. In our GitHub Actions pipeline, after code is built, a background server instance is initialized. Newman runs our collection headlessly. Because Newman exits with code `0` on success and `1` on failure, any broken contract immediately halts the pipeline and aborts deployment to production, guaranteeing zero-defect deployments."*

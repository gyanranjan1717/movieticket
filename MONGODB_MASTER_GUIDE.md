# 🍃 The Ultimate MongoDB Master Guide & Production Reference

> **The Definitive Handbook for MongoDB Mastery**: From absolute zero to senior/staff system architect. This guide covers core document database philosophy, WiredTiger storage engine internals, data modeling patterns, indexing and the ESR rule, the Aggregation Framework, multi-document ACID transactions, replication & sharding topologies, real-world route implementations from this project, and the top interview questions asked by top tech companies.

---

## 📚 Table of Contents

1. [Introduction to MongoDB & NoSQL Philosophy](#1-introduction-to-mongodb--nosql-philosophy)
   - [SQL vs. NoSQL Paradigm Shift](#sql-vs-nosql-paradigm-shift)
   - [Core Terminology Mapping](#core-terminology-mapping)
   - [CAP & PACELC Theorems in MongoDB](#cap--pacelc-theorems-in-mongodb)
2. [MongoDB Internals & Storage Architecture](#2-mongodb-internals--storage-architecture)
   - [BSON vs. JSON (Why BSON?)](#bson-vs-json-why-bson)
   - [The 16MB Document Limit & GridFS](#the-16mb-document-limit--gridfs)
   - [Anatomy of an ObjectId (12 Bytes Demystified)](#anatomy-of-an-objectid-12-bytes-demystified)
   - [WiredTiger Storage Engine Under the Hood](#wiredtiger-storage-engine-under-the-hood)
   - [Checkpoints, Journaling (WAL) & Crash Recovery](#checkpoints-journaling-wal--crash-recovery)
3. [Schema Design & Data Modeling](#3-schema-design--data-modeling)
   - [Embedding (Denormalization) vs. Referencing (Normalization)](#embedding-vs-referencing)
   - [The Rules of Relationship Modeling (1:1, 1:N, 1:Squillions)](#the-rules-of-relationship-modeling)
   - [Production Schema Patterns (Subset, Bucket, Extended Reference)](#production-schema-patterns)
   - [Schema Anti-Patterns to Avoid at All Costs](#schema-anti-patterns-to-avoid)
4. [How MongoDB is Implemented in THIS Project (`movieticket`)](#4-how-mongodb-is-implemented-in-this-project-movieticket)
   - [Connection & Pooling Architecture (`configs/db.js`)](#a-connection--pooling-architecture-backendconfigsdbjs)
   - [Show Schema & Dynamic Seat Dictionary (`models/showModel.js`)](#b-show-schema--dynamic-seat-dictionary-backendmodelsshowmodeljs)
   - [Atomic Seat Reservation Query (`controllers/bookingController.js`)](#c-atomic-seat-reservation-backendcontrollersbookingcontrollerjs)
   - [High-Performance Aggregations (`controllers/adminController.js`)](#d-high-performance-aggregations-backendcontrollersadmincontrollerjs)
   - [Atomic Array Operators in Reviews & Favorites](#e-atomic-array-operators-in-reviews--favorites)
5. [CRUD Mastery & Atomic Update Operators](#5-crud-mastery--atomic-update-operators)
   - [Field Operators (`$set`, `$unset`, `$inc`, `$min`, `$max`)](#field-update-operators)
   - [Array Operators (`$push`, `$addToSet`, `$pull`, positional `$` / `$[elem]`)](#array-update-operators)
   - [Atomic Read-Modify-Write (`findOneAndUpdate`)](#atomic-read-modify-write-findoneandupdate)
6. [The Aggregation Framework Deep Dive](#6-the-aggregation-framework-deep-dive)
   - [Pipeline Concept & Execution Lifecycle](#pipeline-concept--execution-lifecycle)
   - [Core Stages (`$match`, `$project`, `$group`, `$sort`, `$unwind`, `$lookup`, `$facet`)](#core-aggregation-stages)
   - [Performance: Pipeline Optimization & The 100MB RAM Limit](#aggregation-performance--the-100mb-ram-limit)
7. [Indexes & Performance Tuning](#7-indexes--performance-tuning)
   - [How B-Tree Indexes Work in MongoDB](#how-b-tree-indexes-work-in-mongodb)
   - [Index Types (Single, Compound, Multikey, Text, TTL, Partial, Unique)](#index-types)
   - [The Golden Rule: The ESR Rule (Equality, Sort, Range)](#the-golden-rule-the-esr-rule)
   - [Deconstructing `explain("executionStats")` & Covered Queries](#deconstructing-explainexecutionstats--covered-queries)
8. [Transactions, ACID & Concurrency Control](#8-transactions-acid--concurrency-control)
   - [Single-Document Atomicity vs. Multi-Document Transactions](#single-document-atomicity-vs-multi-document-transactions)
   - [Mongoose Sessions & Two-Phase Commits](#mongoose-sessions--transactions-code-example)
   - [Write Concerns (`w`) & Read Concerns (`r`)](#write-concerns-w--read-concerns-r)
9. [High Availability (Replication) & Scalability (Sharding)](#9-high-availability-replication--scalability-sharding)
   - [Replica Sets, Oplog & Automatic Failover](#replica-sets-oplog--automatic-failover)
   - [Read Preferences (`primary`, `secondary`, `nearest`)](#read-preferences)
   - [Sharding Architecture (`mongos`, Config Servers, Shards)](#sharding-architecture)
   - [Choosing the Right Shard Key](#choosing-the-right-shard-key)
10. [Security & Production Hardening](#10-security--production-hardening)
    - [NoSQL Injection Prevention](#nosql-injection-prevention)
    - [Mongoose `.lean()` & Memory Optimization](#mongoose-lean--memory-optimization)
    - [Connection Pool Sizing in Serverless vs. Containers](#connection-pool-sizing)
11. [Comprehensive MongoDB Interview Questions & Detailed Answers](#11-comprehensive-mongodb-interview-questions--detailed-answers)
    - [Junior / Associate Level (Q1 - Q8)](#level-1-junior--associate-questions)
    - [Mid / Senior Level (Q9 - Q18)](#level-2-mid--senior-questions)
    - [Lead / Staff Architect Level (Q19 - Q26)](#level-3-lead--staff-architect-questions)

---

## 1. Introduction to MongoDB & NoSQL Philosophy

### What is MongoDB?
**MongoDB** is a source-available, cross-platform, document-oriented database classified as a **NoSQL** database. Instead of storing data in rigid rows and columns with foreign-key constraints (like PostgreSQL or MySQL), MongoDB stores data as flexible, self-describing **BSON documents** (Binary JSON).

```
RDBMS (Relational)                       MongoDB (Document)
┌────────────────────────────────┐       ┌────────────────────────────────┐
│ Table: users                   │       │ Collection: users              │
├────┬──────────┬────────────────┤       ├────────────────────────────────┤
│ id │ name     │ email          │       │ {                              │
├────┼──────────┼────────────────┤  ───▶ │   "_id": ObjectId("64f..."),   │
│ 1  │ Alex     │ alex@show.com  │       │   "name": "Alex",              │
└────┴──────────┴────────────────┘       │   "email": "alex@show.com"     │
                                         │ }                              │
                                         └────────────────────────────────┘
```

### SQL vs. NoSQL Paradigm Shift

| Feature | Relational Databases (SQL - Postgres, MySQL) | Document Databases (MongoDB) |
| :--- | :--- | :--- |
| **Data Structure** | Tabular (Rows & Columns) | Flexible BSON Documents |
| **Schema** | Rigid, predefined (`ALTER TABLE` required) | Dynamic, polymorphic schema per document |
| **Relationships** | Normalized tables linked via Foreign Keys | Denormalized embedded documents or References |
| **Joins** | Heavy reliance on SQL `JOIN` at query time | Embedded data eliminates joins; `$lookup` available |
| **Scaling** | Vertical (Scale Up: larger CPU, RAM, NVMe) | Horizontal (Scale Out: Sharding across nodes) |
| **Transaction Model** | Full ACID standard across all tables | ACID per single document; Multi-document ACID since 4.0 |
| **Impedance Mismatch**| High (Object-Relational Mapping needed) | Zero (Documents map natively to JSON / JS Objects) |

### Core Terminology Mapping

```
SQL Concept         MongoDB Equivalent
─────────────────────────────────────────────
Database       ───▶ Database
Table          ───▶ Collection
Row / Record   ───▶ Document
Column / Field ───▶ Field / Key
Primary Key    ───▶ _id (Default ObjectId)
Foreign Key    ───▶ Reference (_id string/ObjectId)
Index          ───▶ Index (B-Tree)
JOIN           ───▶ $lookup / Embedding
GROUP BY       ───▶ $group aggregation stage
View           ───▶ View / On-demand Materialized View
```

### CAP & PACELC Theorems in MongoDB
In distributed database theory, Eric Brewer's **CAP Theorem** states that a distributed system can guarantee at most two out of three guarantees:
* **C**onsistency: Every read receives the most recent write or an error.
* **A**vailability: Every non-failing node returns a response without guarantee of most recent data.
* **P**artition Tolerance: The system continues operating despite network packet loss or network splits.

```
                  Consistency
                     /\
                    /  \
                   /    \
                  /      \
                 /  RDBMS \
  Availability  /__________\ Partition Tolerance
                 MongoDB (CP)
              (Cassandra is AP)
```

#### Where does MongoDB sit?
* MongoDB is fundamentally a **CP system** (Consistency + Partition Tolerance).
* If a network partition occurs between replica set nodes, a partition that cannot achieve a majority vote will stop accepting writes, prioritizing **Consistency** over Availability.
* Under the **PACELC Theorem** (If Partition: Trade-off between Availability and Consistency; Else: Trade-off between Latency and Consistency):
  * By default, MongoDB chooses **Consistency over Latency** (`Read/Write Concern: Local/Primary`).
  * However, MongoDB is **tunable**: Setting Read Preference to `secondary` turns it into an AP/eventually consistent system with lower read latency!

---

## 2. MongoDB Internals & Storage Architecture

### BSON vs. JSON (Why BSON?)
Many beginners believe MongoDB stores raw JSON text files. **It does not.** MongoDB encodes documents into **BSON** (Binary JSON).

```
JSON (Text Format):
{"age": 28} ──▶ 11 bytes of raw ASCII characters

BSON (Binary Representation):
\x0e\x00\x00\x00         // Total document length (14 bytes)
\x10                     // Type tag: Int32 (0x10)
age\x00                  // Key name with null terminator (4 bytes)
\x1c\x00\x00\x00         // Value: 28 as 32-bit little-endian binary (4 bytes)
\x00                     // End of document tag
```

#### Why did MongoDB choose BSON over JSON?
1. **Rich Type Support**: JSON only supports Strings, Numbers, Booleans, Arrays, and Objects. BSON adds:
   - `ObjectId`: Globally unique 12-byte identifiers.
   - `Date`: 64-bit UTC integers (prevents string date parsing overhead).
   - `BinData`: Byte arrays for images, audio, cryptography hashes.
   - `Decimal128`: High-precision IEEE 754-2008 numbers for financial/currency transactions (prevents JavaScript floating-point rounding bugs like `0.1 + 0.2 === 0.30000000000000004`).
   - `Int32`, `Int64`, `Timestamp`, `Regex`.
2. **Fast Traversal & Indexing**: BSON prefixes every field with its byte length and type code. The database engine can skip over a 500-character string field in memory without parsing every byte, speeding up internal queries.

---

### The 16MB Document Limit & GridFS
In MongoDB, a single BSON document cannot exceed **16 Megabytes (16,777,216 bytes)**.

#### Why does this limit exist?
* **RAM & Cache Locality**: Keeping documents compact ensures that thousands of documents fit into WiredTiger's RAM cache simultaneously.
* **Network & Serialization**: Prevents single database read queries from exhausting the network pipeline or spiking server CPU during BSON-to-JSON serialization.
* **Memory Protection**: Protects against unbounded runaway document growth caused by improper array push loops.

#### How to store data larger than 16MB? Use GridFS
For files larger than 16MB (like 4K movie files, PDFs, or raw video streams), MongoDB provides **GridFS**. GridFS splits a large file into two collections:
1. `fs.files`: Contains file metadata (filename, upload date, contentType, md5 checksum).
2. `fs.chunks`: Stores the binary data divided into chunks of 255 Kilobytes each, indexed by `{ files_id: 1, n: 1 }`.

---

### Anatomy of an ObjectId (12 Bytes Demystified)
Every document in MongoDB requires a unique `_id` field. If not provided, MongoDB generates an **ObjectId**.

An ObjectId is **12 bytes (96 bits)**, displayed as a **24-character hexadecimal string**:

```
 0                   4            7             9                 12 Bytes
 ┌───────────────────┬────────────┬─────────────┬─────────────────┐
 │ 4-Byte Timestamp  │   5-Byte   │ 3-Byte      │                 │
 │ (Seconds since    │   Random   │ Incrementing│ Total: 12 Bytes │
 │  Unix Epoch)      │   Value    │ Counter     │ (24 Hex Chars)  │
 └───────────────────┴────────────┴─────────────┴─────────────────┘
```

1. **4-Byte Unix Timestamp**: Records the exact second the document was created.
   * *Superpower*: You do **not** need a `createdAt` index to sort documents chronologically! `db.collection.find().sort({ _id: -1 })` automatically sorts by creation time.
   * You can extract the timestamp anytime in code:
     ```javascript
     const createdAt = booking._id.getTimestamp(); // Returns JS Date
     ```
2. **5-Byte Random Value**: Generated per process/machine to prevent cross-server collision.
3. **3-Byte Incrementing Counter**: Initialized to a random value and incremented with each insert on that process.

---

### WiredTiger Storage Engine Under the Hood
Since version 3.2, MongoDB's default storage engine is **WiredTiger**.

```
Client Write Request
        │
        ▼
┌───────────────────────────────────────────────┐
│              WIREDTIGER ENGINE                │
│                                               │
│  1. In-Memory Cache (RAM)                     │
│     ├── Clean Pages (Read from disk)          │
│     └── Dirty Pages (Modified in memory)      │
│                                               │
│  2. Journal (Write-Ahead Log)                 │
│     └── Sequential append to disk (fsync ~50ms│
│                                               │
│  3. Checkpoint (Data Files on Disk)           │
│     └── Writes all dirty pages every 60s/2GB  │
└───────────────────────────────────────────────┘
```

#### 1. In-Memory Cache
* By default, WiredTiger reserves **50% of (Total RAM - 1GB)** (or 256MB, whichever is larger) for its cache.
* When you write a document, it is written to the in-memory cache as a **dirty page**.

#### 2. Concurrency & Locking
* **MMAPv1 (Legacy)** had database-level and collection-level locks (one slow write blocked all reads in the collection).
* **WiredTiger** uses **Document-Level Concurrency Control** via Multi-Version Concurrency Control (MVCC). Multiple threads can write to different documents in the same collection simultaneously without blocking each other.

#### 3. Compression
* WiredTiger compresses collections using **Snappy** (balanced speed/compression) or **zlib** (high compression), typically shrinking raw JSON data by **70% on disk**. Indexes use prefix compression.

---

### Checkpoints, Journaling (WAL) & Crash Recovery
What happens if the server loses power? How does MongoDB guarantee durability without constantly writing to disk?

1. **The Journal (WAL - Write-Ahead Logging)**:
   * Write operations are written to an append-only on-disk binary journal file every 100 milliseconds (or immediately with `j: true`).
   * Appending sequentially to a journal file is ultra-fast compared to random disk writes.
2. **The 60-Second Checkpoint**:
   * Every 60 seconds (or after 2GB of raw data writes), WiredTiger writes all dirty pages from the memory cache out to the primary data files (`collection-*.wt`) as a consistent snapshot called a **Checkpoint**.
3. **Crash Recovery Scenario**:
   * If power cuts at second 45:
   * On reboot, MongoDB loads the clean state from the **last checkpoint** (second 0).
   * It then replays the **Journal log** from second 0 to second 45.
   * Result: **Zero data loss.**

---

## 3. Schema Design & Data Modeling

### Embedding vs. Referencing

```
EMBEDDED (Denormalized)                  REFERENCED (Normalized)
One Single Document                      Two Separate Documents
┌───────────────────────────────┐        ┌──────────────────┐    ┌──────────────────┐
│ Movie                         │        │ Movie            │    │ Review           │
│ {                             │        │ {                │    │ {                │
│   "_id": 101,                 │        │   "_id": 101,    │◀───│   "movie": 101,  │
│   "title": "Inception",       │        │   "title": "..." │    │   "rating": 5    │
│   "casts": [                  │        │ }                │    │ }                │
│     { "name": "DiCaprio" }    │        └──────────────────┘    └──────────────────┘
│   ]                           │        Query: $lookup / populate required
│ }                             │
└───────────────────────────────┘
Query: 1 Single Disk Read (Atomic)
```

### The Rules of Relationship Modeling

#### 1. One-to-One (1:1)
* *Rule*: **Embed by default**, unless the embedded document is large or rarely accessed.
* *Example*: User settings, Movie metadata.
* *When to Reference*: If User has a large `kycVerificationDocuments` array (several megabytes of scanned images), split it to a separate `UserVerification` collection to keep the primary `User` document lean.

#### 2. One-to-Few (1:10 - 1:100)
* *Rule*: **Embed**.
* *Example in this project*: A `Movie` having 10-15 `casts` ([`movieModel.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/models/movieModel.js)). You always display actors alongside movie details. Keeping them in an embedded array avoids costly network joins.

#### 3. One-to-Many (1:1,000 - 1:10,000)
* *Rule*: **Reference (Parent-Referenced or Child-Referenced)**.
* *Example in this project*: A `Movie` having thousands of `reviews` ([`reviewModel.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/models/reviewModel.js)).
* *Why NOT embed?* If 20,000 users leave reviews on "Avengers", an embedded `reviews` array would quickly surpass the 16MB document limit and trigger massive document relocations on disk.

#### 4. One-to-Squillions (1:100,000 - 1:Billions)
* *Rule*: **Parent Reference** (Child documents store the parent ID).
* *Example*: Log files, IoT telemetry, clickstream analytics. The log documents contain `{ "userId": "usr_123", "event": "click" }`.

---

### Production Schema Patterns

#### 1. The Subset Pattern
* **Problem**: A movie has 50,000 reviews. Storing all in the movie document exceeds 16MB. Storing none requires an extra database query just to show the top 3 reviews on the homepage.
* **Solution**: Keep the top 5 most recent/highest-rated reviews embedded inside the `Movie` document, and store the full historical archive in a separate `reviews` collection.

#### 2. The Bucket Pattern (Time-Series / IoT)
* Rather than storing 1 document per second (86,400 documents per day per sensor), store 1 document per hour with an array of 60 minutes or 3,600 readings:
  ```json
  {
    "sensorId": "temp_sensor_1",
    "date": "2026-09-06",
    "hour": 11,
    "readings": [22.4, 22.5, 22.8, 23.1]
  }
  ```
  *Result*: 90% index memory savings and dramatic compression ratios.

#### 3. The Extended Reference Pattern
* Instead of copying an entire referenced document, copy only the 2 or 3 fields you frequently display:
  ```json
  // Inside Booking document:
  {
    "showId": ObjectId("64..."),
    "movie": {
      "title": "Avatar 3",
      "poster": "https://image.tmdb.org/..."
    }
  }
  ```
  *Result*: Display booking tickets without needing `$lookup` or `.populate()`.

---

### Schema Anti-Patterns to Avoid

```
❌ ANTI-PATTERN 1: Massive Unbounded Arrays
   { "_id": 1, "logs": [ ... millions of items ... ] }
   👉 CAUSES: 16MB BSON Document Overflow & Extreme Garbage Collection pressure.

❌ ANTI-PATTERN 2: Deeply Nested Hierarchy (> 100 levels)
   { "company": { "branch": { "dept": { "team": { "member": ... } } } } }
   👉 CAUSES: Complex aggregation pipelines, massive update payload serialization.

❌ ANTI-PATTERN 3: Treating MongoDB like MySQL (Relational Over-Normalization)
   Table for User, Table for UserEmail, Table for UserAddress, Table for UserPhone...
   👉 CAUSES: Dozens of slow $lookup queries destroying NoSQL throughput advantages.
```

---

## 4. How MongoDB is Implemented in THIS Project (`movieticket`)

Let's examine how MongoDB concepts are practically applied in the actual production code of this project.

---

### A. Connection & Pooling Architecture ([`backend/configs/db.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/configs/db.js))

```javascript
import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => console.log('Database connected'));
        await mongoose.connect(`${process.env.MONGODB_URI}/movieticket`);
    } catch (error) {
        console.log(error.message);
    }
};

export default connectDB;
```

#### Under the Hood: Connection Pooling
* Mongoose wraps MongoDB's native driver connection pool.
* By default, it maintains a pool of up to **100 socket connections** (`maxPoolSize: 100`).
* When an HTTP route makes a query, it borrows a connection from the pool, sends the BSON wire message, receives the response, and returns the socket to the pool.
* *Why top-level await is avoided*: Connecting asynchronously ensures that server startup does not crash ungracefully during transient network blips.

---

### B. Show Schema & Dynamic Seat Dictionary ([`backend/models/showModel.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/models/showModel.js))

```javascript
import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Movie' },
    showDateTime: { type: Date, required: true },
    showPrice: { type: Number, required: true },
    occupiedSeats: { type: Object, default: {} }, 
  },
  { minimize: false }
);

// High-performance B-tree compound index
showSchema.index({ movie: 1, showDateTime: 1 });
showSchema.index({ showDateTime: 1 });

const Show = mongoose.model("Show", showSchema);
export default Show;
```

#### Why `{ minimize: false }`?
* Mongoose by default strips empty objects (`{}`) to save space.
* `{ minimize: false }` tells Mongoose to preserve `occupiedSeats: {}` in BSON so that clients can immediately query against an empty dictionary without null reference errors.

#### Why a Dictionary/Object for `occupiedSeats` instead of an Array?
* In a theater with 200 seats:
  * **Array structure**: `occupiedSeats: ["A1", "A2", "B5"]`
    - Finding if seat `D12` is taken requires scanning the array: $O(N)$ lookup.
  * **Dictionary structure**: `occupiedSeats: { "A1": "usr_123", "A2": "usr_456" }`
    - Checking if seat `D12` is taken: `occupiedSeats["D12"]` is an instant **$O(1)$ memory lookup**!
    - Atomic updates can pinpoint exact keys: `updateQuery["occupiedSeats.D12"] = { $exists: false }`.

---

### C. Atomic Seat Reservation ([`backend/controllers/bookingController.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/controllers/bookingController.js))

Here is our optimized, race-condition-free seat booking query:

```javascript
// Step 1: Ensure NONE of the chosen seats are taken at the exact millisecond of write
const atomicCondition = { _id: showId };
selectedSeats.forEach((seat) => {
  atomicCondition[`occupiedSeats.${seat}`] = { $exists: false };
});

// Step 2: Set seats in the dictionary mapped to the buyer's user ID
const seatUpdates = {};
selectedSeats.forEach((seat) => {
  seatUpdates[`occupiedSeats.${seat}`] = userId;
});

// Step 3: Single atomic query executed by WiredTiger
const reservationResult = await Show.findOneAndUpdate(
  atomicCondition,
  { $set: seatUpdates },
  { new: true }
);

if (!reservationResult) {
  return res.status(400).json({
    success: false,
    message: "One or more seats were just booked by another customer.",
  });
}
```

#### Why this eliminates race conditions:
Even if 1,000 customers click "Book" on seat `F1` at the exact same millisecond:
1. WiredTiger acquires a document lock for that specific `Show` document.
2. The first request matches `{ "occupiedSeats.F1": { $exists: false } }` and sets `"occupiedSeats.F1": "user_A"`.
3. The remaining 999 concurrent requests re-evaluate `{ "occupiedSeats.F1": { $exists: false } }`.
4. It evaluates to `false`! The update fails and returns `null`.
5. **Zero double-booking is guaranteed directly at the database engine layer!**

---

### D. High-Performance Aggregations ([`backend/controllers/adminController.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/controllers/adminController.js))

Instead of pulling 100,000 bookings into Node.js memory:

```javascript
const [bookingStatsResult, activeShows, totalUser] = await Promise.all([
    // Database computes sum, count, and average in C++ engine
    Booking.aggregate([
        { $match: { isPaid: true } },
        {
            $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                totalRevenue: { $sum: "$amount" },
                avgTicketPrice: { $avg: "$amount" }
            }
        }
    ]),
    Show.find({ showDateTime: { $gte: new Date() } }).populate("movie").lean(),
    User.countDocuments()
]);
```

* **Network savings**: Transmits **1 single JSON object of 120 bytes** instead of transferring 100,000 JSON documents totaling **35 Megabytes** across the network wire.

---

### E. Atomic Array Operators in Reviews & Favorites

#### Toggling Favorites ([`backend/controllers/userController.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/controllers/userController.js))
```javascript
const updatedUser = await User.findByIdAndUpdate(
  userId,
  exists ? { $pull: { favorites: movieId } } : { $addToSet: { favorites: movieId } },
  { new: true, select: "favorites" }
).lean();
```
* `$addToSet`: Adds the value to the array **only if it does not already exist** (enforces uniqueness without manual array checks).
* `$pull`: Removes all occurrences of the value from the array in an atomic write.

#### Threaded Review Replies ([`backend/controllers/reviewController.js`](file:///c:/Users/rgyan/OneDrive/Desktop/movieticket/backend/controllers/reviewController.js))
```javascript
const updated = await Review.findByIdAndUpdate(
  reviewId,
  { $push: { replies: newReply } },
  { new: true, select: "replies" }
).lean();
```
* `$push`: Atomically appends the new reply document to the `replies` subdocument array without needing to load or re-save the parent review document.

---

## 5. CRUD Mastery & Atomic Update Operators

### Field Update Operators

```javascript
// 1. $set - Overwrites or adds fields
db.movies.updateOne({ _id: id }, { $set: { vote_average: 9.1 } });

// 2. $unset - Deletes fields from the document
db.shows.updateOne({ _id: id }, { $unset: { "occupiedSeats.A1": 1 } });

// 3. $inc - Increments or decrements numbers atomically
db.movies.updateOne({ _id: id }, { $inc: { vote_count: 1 } });

// 4. $min / $max - Updates field only if new value is smaller/larger
db.products.updateOne({ _id: id }, { $min: { lowestPriceSeen: 12.50 } });

// 5. $currentDate - Sets current timestamp
db.users.updateOne({ _id: id }, { $currentDate: { lastLogin: true } });
```

---

### Array Update Operators

| Operator | Action | Example |
| :--- | :--- | :--- |
| **`$push`** | Appends value(s) to an array | `db.reviews.updateOne({ _id }, { $push: { likes: userId } })` |
| **`$addToSet`** | Adds value only if unique (treats array as Set) | `db.users.updateOne({ _id }, { $addToSet: { favorites: movieId } })` |
| **`$pop`** | Removes first (`-1`) or last (`1`) element | `db.queues.updateOne({ _id }, { $pop: { items: -1 } })` |
| **`$pull`** | Removes all matching elements from array | `db.users.updateOne({ _id }, { $pull: { favorites: movieId } })` |
| **`$pullAll`** | Removes multiple specific values | `db.shows.updateOne({ _id }, { $pullAll: { seats: ["A1", "A2"] } })` |

#### Advanced Positional Operators
1. **Positional Operator `$`**: Updates the *first* array element that matched the query condition:
   ```javascript
   // Change status of only the clicked seat in a seats array
   db.shows.updateOne(
     { _id: showId, "seats.number": "A1" },
     { $set: { "seats.$.status": "reserved" } }
   );
   ```
2. **All-Positional Operator `$[]`**: Updates *every* element in the array:
   ```javascript
   // Increase all ticket prices by $2
   db.shows.updateMany({}, { $inc: { "seats.$[].price": 2 } });
   ```
3. **Filtered Positional Operator `$[<identifier>]`**: Updates elements matching a specific condition:
   ```javascript
   db.shows.updateOne(
     { _id: showId },
     { $set: { "seats.$[elem].status": "vip" } },
     { arrayFilters: [{ "elem.row": "A" }] }
   );
   ```

---

## 6. The Aggregation Framework Deep Dive

The **Aggregation Framework** is MongoDB's built-in data processing engine modeled on the concept of data processing pipelines (similar to Unix pipes `cat | grep | sort | awk`).

```
Input Documents
      │
      ▼
 ┌──────────┐
 │  $match  │ ── Filter documents (like SQL WHERE)
 └──────────┘
      │
      ▼
 ┌──────────┐
 │  $group  │ ── Group by key and calculate aggregates (like SQL GROUP BY)
 └──────────┘
      │
      ▼
 ┌──────────┐
 │  $sort   │ ── Order output (like SQL ORDER BY)
 └──────────┘
      │
      ▼
 ┌──────────┐
 │ $project │ ── Reshape fields & omit passwords (like SQL SELECT)
 └──────────┘
      │
      ▼
Final Results
```

### Core Aggregation Stages

#### 1. `$match`
Filters documents to pass only matching documents to the next stage.
* *Best Practice*: Always put `$match` as the **very first stage** so it can utilize B-tree indexes (`IXSCAN`) and prune unneeded documents immediately.

#### 2. `$group`
Groups input documents by the specified `_id` expression and applies accumulator expressions:
```javascript
db.bookings.aggregate([
  { $match: { isPaid: true } },
  {
    $group: {
      _id: "$user",                  // Group by User ID
      totalSpent: { $sum: "$amount" },
      totalTickets: { $sum: { $size: "$bookedSeats" } },
      lastBookingDate: { $max: "$createdAt" }
    }
  }
]);
```

#### 3. `$lookup` (Left Outer Join)
Performs a join with another collection in the same database:
```javascript
db.bookings.aggregate([
  {
    $lookup: {
      from: "shows",                 // Target collection to join
      localField: "show",            // Field in Booking document
      foreignField: "_id",           // Field in Show document
      as: "showDetails"              // Output array field name
    }
  },
  { $unwind: "$showDetails" }        // Deconstruct array into single object
]);
```

#### 4. `$unwind`
Deconstructs an array field from the input documents to output a document for *each* element in the array:
```javascript
// Input document:  { "_id": 1, "genres": ["Action", "Sci-Fi"] }
// Output documents:
// { "_id": 1, "genres": "Action" }
// { "_id": 1, "genres": "Sci-Fi" }
```

#### 5. `$facet` (Multi-Faceted Search & Pagination)
Processes multiple aggregation pipelines within a single stage on the same input documents. Essential for e-commerce filtering + pagination:
```javascript
db.movies.aggregate([
  { $match: { vote_average: { $gte: 7.0 } } },
  {
    $facet: {
      // Facet 1: Paginated Data
      "paginatedMovies": [
        { $sort: { releaseDate: -1 } },
        { $skip: 0 },
        { $limit: 10 }
      ],
      // Facet 2: Total Count
      "totalCount": [
        { $count: "total" }
      ],
      // Facet 3: Genre Breakdown for Sidebar Filters
      "genreStats": [
        { $unwind: "$genres" },
        { $group: { _id: "$genres", count: { $sum: 1 } } }
      ]
    }
  }
]);
```

---

### Aggregation Performance & The 100MB RAM Limit
* **The 100MB Barrier**: Each aggregation pipeline stage has a strict RAM limit of **100MB**. If an unindexed `$sort` or large `$group` exceeds 100MB of RAM, MongoDB terminates with an error:
  `QueryExceededMemoryLimitNoDiskUseAllowed`
* **Solutions**:
  1. **Index Early**: Ensure `$match` and `$sort` utilize indexes so MongoDB doesn't have to perform in-memory blocking sorts.
  2. **`allowDiskUse: true`**: Pass `{ allowDiskUse: true }` in query options to allow temporary spillover to disk files (slower, but prevents queries from crashing).

---

## 7. Indexes & Performance Tuning

### How B-Tree Indexes Work in MongoDB
By default, collections without indexes perform a **`COLLSCAN`** (Collection Scan): Every single document on disk is inspected in sequence.
With an index, MongoDB constructs an in-memory **B-Tree (Balanced Tree)** data structure:

```
                      [ Root Node: "Inception" ]
                             /          \
                            /            \
          [ "Avatar" .. "Dune" ]     [ "Interstellar" .. "Titanic" ]
                  /        \                  /             \
             Leaf Pages (Sorted pointers directly to disk location)
```

Time complexity drops from **$O(N)$** linear scan to **$O(\log N)$** logarithmic search!

---

### Index Types

1. **Single Field Index**:
   ```javascript
   showSchema.index({ showDateTime: 1 }); // 1 = Ascending, -1 = Descending
   ```
2. **Compound Index**: Index on multiple fields:
   ```javascript
   bookingSchema.index({ user: 1, createdAt: -1 });
   ```
3. **Multikey Index (Array Indexing)**:
   When indexing a field containing an array (like `genres: ["Action", "Drama"]`), MongoDB automatically creates a separate index key for every element in the array.
4. **Text Index**:
   ```javascript
   movieSchema.index({ title: "text", overview: "text" });
   // Queried with: db.movies.find({ $text: { $search: "inception dream" } })
   ```
5. **TTL (Time-To-Live) Index**:
   Automatically deletes documents after a specified number of seconds:
   ```javascript
   // Auto-delete OTP after 5 minutes (300 seconds)
   otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });
   ```
6. **Partial Index**:
   Indexes only documents meeting a specific filter condition (saves RAM):
   ```javascript
   // Only index paid bookings
   bookingSchema.index({ show: 1 }, { partialFilterExpression: { isPaid: true } });
   ```

---

### The Golden Rule: The ESR Rule
When creating compound indexes, always order fields using the **ESR Rule**:
1. **E**quality: Fields checked for exact equality (`field: "exactValue"`).
2. **S**ort: Fields used to determine document ordering (`sort({ createdAt: -1 })`).
3. **R**ange: Fields queried with range comparisons (`$gt`, `$lt`, `$in`, `$ne`).

```
Query:
db.shows.find({ movie: movieId, showDateTime: { $gte: today } }).sort({ price: 1 })

✅ CORRECT COMPOUND INDEX (ESR):
{
  movie: 1,         // [E] Equality
  price: 1,         // [S] Sort
  showDateTime: 1   // [R] Range
}

❌ INCORRECT (Puts Range before Sort):
{ movie: 1, showDateTime: 1, price: 1 }
👉 Causes an in-memory SORT_KEY_GENERATOR blocking sort!
```

---

### Deconstructing `explain("executionStats")` & Covered Queries
To analyze how MongoDB executes your query, append `.explain("executionStats")`:

```javascript
const stats = await Show.find({ movie: movieId }).explain("executionStats");
console.log(stats.executionStats);
```

#### Metrics to Inspect:
1. **`stage`**:
   - `COLLSCAN` = ❌ **Terrible**. Scanning entire table.
   - `IXSCAN` = ✅ **Good**. Scanning B-Tree index.
   - `FETCH` = Retrieving document data from disk based on index pointers.
2. **`totalDocsExamined` vs. `nReturned`**:
   - **Ideal**: `totalDocsExamined === nReturned` (You only touched the documents you actually returned).
   - **Bad**: `totalDocsExamined: 50000, nReturned: 2` (Database had to inspect 50,000 documents to find 2).
3. **Covered Query (`PROJECTION_COVERED`)**:
   - The ultimate performance optimization: When all queried fields AND projected fields exist in the index, MongoDB fulfills the query **directly from the index in RAM without touching the disk collection at all**!
   - `totalDocsExamined: 0`!

---

## 8. Transactions, ACID & Concurrency Control

### Single-Document Atomicity vs. Multi-Document Transactions

| Feature | Single-Document Write | Multi-Document Transaction |
| :--- | :--- | :--- |
| **Scope** | Modifying 1 document (including embedded arrays) | Modifying multiple documents across collections |
| **Availability** | Available in ALL MongoDB versions (Standalone/Replica) | Requires Replica Set (4.0+) or Sharded Cluster (4.2+) |
| **Performance** | Ultra fast (sub-millisecond) | Slower (Locks held, MVCC snapshot coordination) |
| **Locking Overhead** | Immediate release | Held until transaction commits or aborts |

> [!TIP]
> In 95% of MongoDB applications, good schema design (embedding related data) achieves atomicity naturally **without** multi-document transactions! Reserve transactions for critical multi-entity operations (e.g., transferring account balances between two distinct users).

---

### Mongoose Sessions & Transactions Code Example

```javascript
import mongoose from "mongoose";
import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";

export const executeBookingTransaction = async (userId, showId, seats, amount) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Reserve seats atomically inside the session
    const show = await Show.findOneAndUpdate(
      { _id: showId, ...seats.reduce((acc, s) => ({ ...acc, [`occupiedSeats.${s}`]: { $exists: false } }), {}) },
      { $set: seats.reduce((acc, s) => ({ ...acc, [`occupiedSeats.${s}`]: userId }), {}) },
      { session, new: true }
    );

    if (!show) {
      throw new Error("Seats already taken.");
    }

    // 2. Create booking record inside the session
    const booking = await Booking.create([{
      user: userId,
      show: showId,
      amount,
      bookedSeats: seats,
      isPaid: true
    }], { session });

    // 3. Commit all changes atomically
    await session.commitTransaction();
    return { success: true, booking: booking[0] };

  } catch (error) {
    // 4. Abort and rollback every modification if ANY step fails
    await session.abortTransaction();
    throw error;
  } finally {
    // 5. Always end session to return connection to pool
    await session.endSession();
  }
};
```

---

### Write Concerns (`w`) & Read Concerns (`r`)

#### Write Concern (`w` and `j`):
Controls the level of acknowledgment requested from MongoDB for write operations:
* `w: 1`: Write is acknowledged as soon as the **Primary** node has written to its memory/journal (Default).
* `w: "majority"`: Write is acknowledged only after a **majority of replica nodes** have applied the write to memory. Protects against rollback if Primary crashes!
* `j: true`: Acknowledged only after being committed to the on-disk journal.

#### Read Concern (`r`):
Controls data isolation and consistency for read queries:
* `local`: Default. Returns most recent data on the node queried; no guarantee that write won't be rolled back.
* `majority`: Returns data that has been acknowledged by a majority of replica set members (cannot be rolled back).
* `linearizable`: Guarantees real-time serializability across all nodes (highest consistency, higher read latency).

---

## 9. High Availability (Replication) & Scalability (Sharding)

### Replica Sets, Oplog & Automatic Failover

A **Replica Set** is a group of `mongod` instances that maintain the exact same data set, providing redundancy and high availability.

```
                  ┌──────────────────┐
                  │   PRIMARY NODE   │ (Accepts all Writes)
                  │   (Read/Write)   │
                  └────────┬─────────┘
           Replicates Oplog│ (Asynchronous)
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌──────────────────┐               ┌──────────────────┐
│  SECONDARY NODE  │               │  SECONDARY NODE  │
│   (Read Only)    │               │   (Read Only)    │
└──────────────────┘               └──────────────────┘
```

#### How it works:
1. **The Oplog (Operations Log)**:
   - A capped collection on the Primary node (`local.oplog.rs`).
   - Every write operation is converted into an idempotent operation and appended to the oplog.
   - Secondaries continuously poll and apply the Primary's oplog to mirror data.
2. **Heartbeats & Automatic Failover**:
   - Nodes ping each other every 2 seconds via heartbeat.
   - If the Primary goes down or loses communication for > 10 seconds, the remaining Secondaries hold an automatic election (Raft-like consensus protocol).
   - The Secondary with the most up-to-date oplog is elected as the **New Primary**.
   - *Requirement*: Always use an **odd number of voting nodes** (e.g., 3, 5) to prevent split-brain ties.

---

### Read Preferences
Controls where read queries are routed:
* `primary`: (Default) All reads go to Primary. Guarantees strict consistency.
* `secondary`: All reads go to Secondaries (offloads analytics/heavy reports from Primary).
* `primaryPreferred`: Reads from Primary if available, otherwise Secondary.
* `secondaryPreferred`: Reads from Secondary, falls back to Primary if all secondaries are down.
* `nearest`: Reads from the node with the lowest network latency.

---

### Sharding Architecture

When data volume exceeds the storage capacity of a single machine or write throughput saturates a single Primary node, MongoDB scales horizontally via **Sharding**.

```
                           Client / Application
                                    │
                                    ▼
                          ┌──────────────────┐
                          │   mongos router  │ (Stateless Query Router)
                          └─────────┬────────┘
                                    │ Reads metadata
                                    ▼
                          ┌──────────────────┐
                          │  Config Servers  │ (Stores metadata & Chunk ranges)
                          └──────────────────┘
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
      ┌─────────────────┐                       ┌─────────────────┐
      │     SHARD 1     │                       │     SHARD 2     │
      │  (Replica Set)  │                       │  (Replica Set)  │
      │ User IDs A - M  │                       │ User IDs N - Z  │
      └─────────────────┘                       └─────────────────┘
```

#### The Components:
1. **`mongos`**: The query router. Clients connect directly to `mongos`. It caches metadata and routes requests to the correct shard.
2. **Config Servers**: A dedicated replica set storing cluster metadata and the mapping of chunks to shards.
3. **Shards**: The actual replica sets storing partitions of the database collection.

#### Choosing the Right Shard Key:
* **Hashed Shard Key**: `shardCollection("users", { _id: "hashed" })`
  - Hashes the key value uniformly across all shards.
  - *Best for*: Even write distribution.
* **Range-Based Shard Key**: Groups related keys together.
  - *Pitfall*: If using an auto-incrementing or date timestamp key, all current writes hit a single shard (the "hotspot" problem).

---

## 10. Security & Production Hardening

### NoSQL Injection Prevention
Contrary to popular belief, MongoDB is susceptible to injection if raw request inputs are passed directly to queries:

```javascript
// ❌ VULNERABLE CODE:
// If attacker sends { "email": "admin@show.com", "password": { "$ne": null } }
app.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email, password: req.body.password });
  // $ne null evaluates to true! Attacker bypasses authentication!
});

// ✅ SECURE CODE (Type Validation & Sanitization):
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6), // Strict string check prevents object injection
});

app.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email: email.trim() });
  // Verify password with bcrypt.compare...
});
```

---

### Mongoose `.lean()` & Memory Optimization

By default, Mongoose returns full Mongoose Document instances. A Mongoose Document carries:
* Change tracking internal arrays.
* Virtual getters and setters.
* Schema casting and validation prototypes.

```javascript
// ❌ Heavy (Loads 50,000 Mongoose Document classes into Node.js heap)
const movies = await Movie.find(); 

// ✅ Lean (Returns pure, lightweight JavaScript Plain Objects)
const movies = await Movie.find().lean();
```
* Adding `.lean()` results in **3x to 5x faster query execution** and **up to 70% reduction in RAM usage**.
* *When NOT to use `.lean()`*: When you need to call `.save()` directly on the returned document or access virtual fields.

---

## 11. Comprehensive MongoDB Interview Questions & Detailed Answers

---

### Level 1: Junior / Associate Questions

#### Q1: What is the difference between MongoDB and Relational Databases like MySQL?
* **Answer**: MySQL is relational and schema-rigid, storing data in normalized tables linked via foreign keys and relying heavily on `JOIN` operations. Scaling is primarily vertical. MongoDB is a document database that stores self-describing, schema-flexible BSON documents. Related data is typically embedded into single documents, eliminating join latency and aligning directly with JSON/JavaScript application code. Scaling is achieved horizontally via built-in sharding.

#### Q2: What is BSON, and why does MongoDB use BSON instead of plain JSON?
* **Answer**: BSON stands for Binary JSON. While JSON is a text format limited to strings, numbers, and booleans, BSON is a binary-encoded serialization format that supports rich data types such as `ObjectId`, `ISODate`, `Decimal128` (financial precision), and `BinData`. Furthermore, BSON documents encode field lengths and type tags, enabling the database engine to rapidly traverse documents in memory without string parsing overhead.

#### Q3: What is an `_id` field, and what makes up an `ObjectId`?
* **Answer**: The `_id` field serves as the mandatory primary key for every MongoDB document. By default, it is a 12-byte (24-hex character) BSON `ObjectId` composed of:
  1. A 4-byte Unix epoch timestamp.
  2. A 5-byte random value unique to the machine/process.
  3. A 3-byte incrementing counter initialized to a random number.
  Because the first 4 bytes are a timestamp, sorting by `_id` automatically sorts documents chronologically.

#### Q4: When should you Embed documents versus Reference documents in MongoDB?
* **Answer**:
  * **Embed (Denormalize)** when data has a 1:1 or 1:Few relationship, when related data is always accessed together with the parent document, and when the embedded array will not grow unboundedly (e.g., cast members in a movie, shipping address in a user profile).
  * **Reference (Normalize)** when data has a 1:Many or 1:Squillions relationship, when related data is accessed independently, when documents are frequently updated by different actors, or when embedding would exceed the 16MB document size limit (e.g., user reviews on a blockbuster movie, system activity logs).

#### Q5: What is a Collection Scan (`COLLSCAN`) and how do you prevent it?
* **Answer**: A `COLLSCAN` occurs when MongoDB must scan every document in a collection sequentially from start to finish because no suitable index exists for the query predicate. It is prevented by creating B-Tree indexes matching the query filter using `collection.createIndex({ fieldName: 1 })`.

#### Q6: What does Mongoose's `.lean()` method do, and why should you use it?
* **Answer**: By default, Mongoose wraps query results in rich Mongoose Document instances featuring internal state machines, change-tracking, validation rules, and getters. Appending `.lean()` instructs Mongoose to skip class hydration and return high-performance plain JavaScript objects. This improves query speed by 3x–5x and reduces RAM consumption by up to 70% for read-heavy operations.

#### Q7: What is the difference between `$set` and updating without an operator in MongoDB?
* **Answer**: In modern MongoDB drivers, `$set` updates or adds only the specified fields while leaving all other existing fields in the document intact. In legacy MongoDB `update()` operations, omitting `$set` would replace the entire existing document with the new object, accidentally erasing unmentioned fields.

#### Q8: What is a TTL (Time-To-Live) index?
* **Answer**: A TTL index is a special single-field index on a date field that automatically deletes documents after a specified number of seconds (e.g., `{ expireAfterSeconds: 300 }`). MongoDB's background thread runs once every 60 seconds to purge expired documents, making it ideal for temporary verification OTPs, user sessions, and cache entries.

---

### Level 2: Mid / Senior Questions

#### Q9: Explain the ESR Rule in Compound Index design. Why is the order critical?
* **Answer**: The ESR Rule dictates the optimal ordering of fields in a compound index:
  1. **E - Equality**: Put fields queried with exact matches first (`{ status: "confirmed" }`). This immediately narrows the B-Tree search space to a tiny subset.
  2. **S - Sort**: Put fields used in the `sort()` clause second (`{ createdAt: -1 }`). This allows MongoDB to return documents in the requested order directly from the B-Tree index, avoiding expensive in-memory blocking sorts (`SORT_KEY_GENERATOR`).
  3. **R - Range**: Put fields queried with range predicates last (`{ price: { $gte: 10, $lte: 50 } }`).
  *If Range is placed before Sort, the index cannot satisfy both the range scan and the sort order simultaneously, forcing MongoDB to perform an in-memory sort.*

#### Q10: What is a "Covered Query" in MongoDB, and why is it the fastest query possible?
* **Answer**: A Covered Query is an execution where:
  1. All fields in the query predicate are part of an index.
  2. All fields returned in the projection are part of the same index (with `_id: 0` explicitly specified if `_id` is not in the index).
  Because the index contains all necessary data, MongoDB fulfills the query entirely from RAM (`IXSCAN` without a `FETCH` stage). `totalDocsExamined` is 0, completely bypassing disk I/O.

#### Q11: How does MongoDB achieve concurrency control without table locks?
* **Answer**: MongoDB's WiredTiger storage engine implements **Document-Level Concurrency Control** via Multi-Version Concurrency Control (MVCC). When a thread writes to a document, WiredTiger creates an in-memory private copy. Reads proceed without locks against the snapshot of the document. Conflicting concurrent writes to the same document are serialized, but concurrent writes to different documents within the same collection proceed in parallel with zero lock contention.

#### Q12: How do you prevent double-booking race conditions in MongoDB without external locking tools?
* **Answer**: By leveraging MongoDB's single-document atomicity via `findOneAndUpdate` with a conditional update predicate. For example, when reserving seat `B12`:
  ```javascript
  Show.findOneAndUpdate(
    { _id: showId, "occupiedSeats.B12": { $exists: false } },
    { $set: { "occupiedSeats.B12": userId } },
    { new: true }
  );
  ```
  Even if 1,000 requests arrive concurrently, WiredTiger serializes writes to that document. Only the first write matches `{ $exists: false }`; all subsequent requests fail and return `null`.

#### Q13: What is the difference between `$push` and `$addToSet`?
* **Answer**: Both append elements to an array in a document. However, `$push` unconditionally appends the element (permitting duplicates), while `$addToSet` treats the array as a mathematical set, adding the element only if it does not already exist in the array.

#### Q14: How does the Aggregation Pipeline handle memory limits, and what happens when an aggregation exceeds 100MB?
* **Answer**: Each pipeline stage (especially `$group` and `$sort`) is allocated a maximum of 100MB of RAM. If an unindexed stage exceeds 100MB, MongoDB terminates the operation with an error. To resolve this:
  1. Filter and sort using indexed fields early in the pipeline (`$match` and `$sort`).
  2. Enable `{ allowDiskUse: true }` in query options, allowing MongoDB to spill intermediate data to temporary disk files.

#### Q15: What is the Write-Ahead Log (Journal) in WiredTiger, and how does it prevent data loss during power failure?
* **Answer**: WiredTiger holds dirty pages in memory and only flushes them to primary disk data files during checkpoints every 60 seconds. To prevent data loss between checkpoints, all write operations are appended sequentially to an on-disk binary Journal (Write-Ahead Log) every 100ms (or immediately if `j: true`). On crash recovery, MongoDB restores the last clean checkpoint snapshot and replays the journal entries to restore all committed writes.

#### Q16: What is a Multikey Index, and what is its primary limitation?
* **Answer**: A Multikey Index is an index on a field that holds an array. MongoDB indexes every individual element in the array.
  * *Limitation*: A compound multikey index **cannot index more than one array field** per document (e.g., you cannot create a compound index on `{ tags: 1, categories: 1 }` if both are arrays). This prevents combinatorial explosion of index entries ($N \times M$ index keys).

#### Q17: What is the difference between `w: 1` and `w: "majority"` Write Concerns?
* **Answer**:
  * `w: 1`: The write is acknowledged as soon as the **Primary** node writes to its memory cache/journal. If the Primary crashes before replicating to Secondaries, the write can be rolled back.
  * `w: "majority"`: The write is acknowledged only after being replicated to a majority of voting replica set members. This guarantees durability against failovers (cannot be rolled back).

#### Q18: What is the difference between `$lookup` and relational SQL `JOIN`?
* **Answer**: Conceptually, `$lookup` performs a left outer join, matching documents from an external collection and outputting the matches as an array inside the parent document. However, unlike SQL engines that optimize joins using cost-based optimizers and merge-joins across normalized schemas, `$lookup` in MongoDB is computationally expensive if the foreign field is unindexed, as it must execute child lookups for each parent document.

---

### Level 3: Lead / Staff Architect Level Questions

#### Q19: How does MongoDB elect a new Primary during a Replica Set failover? Can a Secondary with stale data become Primary?
* **Answer**: MongoDB uses a consensus protocol derived from Raft. When a Primary stops sending heartbeats for 10 seconds:
  1. Secondaries declare an election timeout and transition to candidate status.
  2. A candidate requests votes from other voting members.
  3. A voting node will **only** vote for a candidate if:
     - The candidate's `oplog` is as up-to-date or newer than the voter's oplog (checked via last applied optime and term).
     - The candidate has reached a majority consensus.
  *Stale nodes cannot become Primary* because members with newer oplogs will reject their vote request. If an old Primary recovers with un-replicated writes, those writes are written to a `rollback/` BSON directory and reverted.

#### Q20: Explain the "Hotspot" Sharding problem. How do you prevent it when sharding by date or auto-incrementing ID?
* **Answer**: When using a monotonically increasing shard key (like `createdAt` or auto-incrementing integers), every new write has a value greater than all previous keys. Consequently, all incoming writes route exclusively to the maximum chunk on a **single shard**, leaving all other shards completely idle (the write hotspot).
* **Prevention**:
  1. **Hashed Sharding**: Shard on `{ createdAt: "hashed" }` or `{ _id: "hashed" }`, distributing writes uniformly across all shards using an MD5 hash.
  2. **Compound Shard Key**: Pair a high-cardinality prefix field with the timestamp: `{ tenantId: 1, createdAt: 1 }`. Writes for different tenants distribute across the cluster while range queries within a tenant remain localized.

#### Q21: What is the difference between "Scatter-Gather" queries and "Targeted" queries in a sharded cluster?
* **Answer**:
  * **Targeted Query**: The query includes the **Shard Key** in its filter. The `mongos` router inspects the chunk metadata and routes the query directly to the single shard holding those documents.
  * **Scatter-Gather Query**: The query omits the Shard Key. The `mongos` router has no way of knowing which shard holds the data, so it must broadcast the query to **every single shard in the cluster**, wait for all responses, merge the results, and return them. Scatter-gather queries severely degrade throughput at scale.

#### Q22: What are Multi-Document ACID Transactions, what are their performance trade-offs, and when should you reject them?
* **Answer**: Introduced in MongoDB 4.0 (replica sets) and 4.2 (sharded clusters), multi-document transactions allow atomic operations across multiple documents and collections using WiredTiger snapshots.
  * **Trade-offs**: Transactions hold locks and allocate memory in the WiredTiger cache to maintain snapshot isolation. Long-running transactions (> 60s) cause cache pressure, abort timeouts, and lock contention.
  * **When to Reject**: If an operation can be modeled via embedded documents or idempotent event-driven state machines (e.g., Saga pattern, 2-phase checkout with status flags), transactions should be rejected in favor of native single-document atomicity.

#### Q23: How does the WiredTiger Cache evict pages, and what causes Cache Eviction Stalls?
* **Answer**: WiredTiger maintains background eviction server threads monitoring cache fullness:
  * At **80% cache capacity**, background eviction begins moving clean pages out of RAM and writing dirty pages to disk.
  * At **95% cache capacity**, **Application Eviction** kicks in: WiredTiger forces incoming client request threads to perform disk eviction themselves before executing their queries.
  * *Result*: Client API latency spikes from 1ms to 5,000ms+ (Cache Eviction Stall).
  * *Causes*: Massive unindexed queries loading huge collections into cache, slow disk I/O preventing dirty page writes, or unbounded array updates creating enormous dirty pages.

#### Q24: What is the difference between Read Concern `majority` and `linearizable`?
* **Answer**:
  * `readConcern: "majority"`: Returns data acknowledged by a majority of nodes. Fast, non-blocking, and protected against rollbacks. However, in a network partition, a stale Primary could return majority data from slightly in the past before it realizes it has been partitioned.
  * `readConcern: "linearizable"`: The Primary must perform an internal round-trip heartbeat check with a majority of nodes *during the read query itself* to prove it is still the legitimate Primary before returning data. Guarantees absolute real-time serializability, but incurs significant network latency overhead.

#### Q25: What is the "Document Move" problem in WiredTiger, and how does it differ from older engines?
* **Answer**: In legacy MMAPv1, documents were allocated in fixed contiguous disk blocks. If an update grew a document beyond its padding, the engine had to move the entire document to the end of the data file and update all index pointers (extremely slow). WiredTiger avoids this by using allocated variable-length memory pages and copy-on-write page splits: growing a document never moves it across files, but simply causes a page split in the B-Tree when the 32KB leaf page fills up.

#### Q26: Design a real-time analytics schema for millions of events per second with sub-second dashboard queries.
* **Answer**:
  1. **Storage Layer**: Use MongoDB **Time Series Collections** (`timeseries: { timeField: "timestamp", metaField: "metadata", granularity: "seconds" }`). Under the hood, MongoDB columnar-compresses time-series data into hidden bucket collections, reducing storage by 90%.
  2. **Aggregation Layer**: Utilize **On-Demand Materialized Views** (`$merge` stage) scheduled via Inngest or background cron to pre-aggregate 1-minute and 1-hour metrics into dedicated summary collections.
  3. **Indexing**: Apply compound index on `{ "metadata.tenantId": 1, "timestamp": -1 }` adhering to the ESR rule.
  4. **Retention**: Apply automatic TTL expiry on the raw time-series collection (e.g., 30 days) while retaining the pre-aggregated summary documents indefinitely.

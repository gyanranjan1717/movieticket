import autocannon from 'autocannon';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import redis, { safeRedisDel } from '../configs/redis.js';
import Show from '../models/showModel.js';
import Movie from '../models/movieModel.js';
import Booking from '../models/bookingModel.js';
import User from '../models/User.js';

import connectDB from '../configs/db.js';

dotenv.config();

const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'movieticket_super_secret_jwt_key_2026';

// Helper to format table rows
function formatRow(cols, widths) {
  return cols.map((c, i) => String(c).padEnd(widths[i])).join(' | ');
}

async function setupTestEnvironment() {
  console.log(' Connecting to MongoDB & Redis...');
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  // Ensure Redis connection
  if (redis.status !== 'ready') {
    await new Promise((resolve) => {
      redis.once('ready', resolve);
      setTimeout(resolve, 3000);
    });
  }

  // 1. Create or ensure test users for concurrent booking simulation
  console.log(' Initializing test user pool...');
  const testUsers = [];
  const tokens = [];

  const MAX_USERS = 1000;
  const userOps = [];
  for (let i = 1; i <= MAX_USERS; i++) {
    const userId = `loadtest_user_${i}`;
    userOps.push({
      updateOne: {
        filter: { _id: userId },
        update: {
          $set: {
            _id: userId,
            name: `Load Test User ${i}`,
            email: `loadtest_${i}@example.com`,
            role: 'user',
          },
        },
        upsert: true,
      },
    });
    testUsers.push(userId);
    tokens.push(jwt.sign({ userId, email: `loadtest_${i}@example.com`, role: 'user' }, JWT_SECRET, { expiresIn: '1h' }));
  }
  await User.bulkWrite(userOps);

  // 2. Find or create a test movie and test show
  console.log(' Preparing test movie & show...');
  let movie = await Movie.findOne();
  if (!movie) {
    movie = await Movie.create({
      watchmodeId: 999999,
      title: 'Inception Concurrency Test',
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
      backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
      overview: 'Movie ticket concurrency test show',
      releaseDate: '2026-01-01',
      genres: ['Sci-Fi', 'Action'],
      vote_average: 9.0,
      vote_count: 1000,
    });
  }

  let show = await Show.findOne();
  if (!show) {
    show = await Show.create({
      movie: movie._id,
      showDateTime: new Date(Date.now() + 24 * 3600 * 1000),
      showPrice: 15,
      occupiedSeats: {},
    });
  }

  return { show, testUsers, tokens };
}

async function runConcurrencyTestForSeat({ showId, targetSeat, concurrency, tokens }) {
  console.log(`\n======================================================`);
  console.log(` Running Race Condition Test: Concurrency = ${concurrency} on Seat "${targetSeat}"`);
  console.log(`======================================================`);

  // Clear any existing Redis lock for this seat
  const lockKey = `lock:show:${showId}:seat:${targetSeat}`;
  await safeRedisDel(lockKey);

  // Ensure seat is unbooked in MongoDB before starting
  await Show.findByIdAndUpdate(showId, { $unset: { [`occupiedSeats.${targetSeat}`]: 1 } });
  await Booking.deleteMany({ show: showId, bookedSeats: targetSeat });

  const statusCodeCounts = {
    '201': 0, // Successfully locked & reserved
    '400': 0, // Rejected (seat locked or taken)
    '401': 0, // Unauthorized
    '404': 0, // Show not found
    '500': 0, // Internal error
  };

  const latencies = [];
  let userIndex = 0;

  // Custom request list rotating through distinct authenticated user tokens
  const requests = [];
  for (let i = 0; i < concurrency; i++) {
    const token = tokens[i % tokens.length];
    requests.push({
      method: 'POST',
      path: '/api/booking/create',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        origin: 'http://localhost:5173',
      },
      body: JSON.stringify({
        showId: showId.toString(),
        selectedSeats: [targetSeat],
      }),
    });
  }

  // Execute burst with autocannon
  const result = await new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: BASE_URL,
        connections: concurrency,
        amount: concurrency, // Exactly N requests fired in parallel
        pipelining: 1,
        timeout: 45,
        requests,
      },
      (err, res) => {
        if (err) return reject(err);
        resolve(res);
      }
    );

    instance.on('response', (client, statusCode, returnBytes, responseTime) => {
      const codeStr = String(statusCode);
      statusCodeCounts[codeStr] = (statusCodeCounts[codeStr] || 0) + 1;
      latencies.push(responseTime);
    });
  });

  // Small delay to allow any pending async operations/webhooks to settle
  await new Promise((r) => setTimeout(r, 1000));

  // Verify Database State directly
  const updatedShow = await Show.findById(showId).lean();
  const dbBookingCount = await Booking.countDocuments({
    show: showId,
    bookedSeats: targetSeat,
  });

  const seatOwnerInDb = updatedShow?.occupiedSeats?.[targetSeat] || null;

  const winningBooking = await Booking.findOne({
    show: showId,
    bookedSeats: targetSeat,
  }).lean();

  if (winningBooking) {
    console.log(`   🔎 VERIFIED IN REAL MONGODB:`);
    console.log(`      - Booking ID  : ${winningBooking._id}`);
    console.log(`      - Winning User: ${winningBooking.user}`);
    console.log(`      - Stripe URL  : ${winningBooking.paymentLink || 'Created'}`);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const meanLatency = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : 0;

  const doubleBookingDetected = dbBookingCount > 1;

  return {
    concurrency,
    seat: targetSeat,
    totalRequests: result.requests.total,
    success201: statusCodeCounts['201'],
    rejected400: statusCodeCounts['400'],
    errors500: statusCodeCounts['500'],
    meanLatency: `${meanLatency}ms`,
    p50: `${p50}ms`,
    p95: `${p95}ms`,
    p99: `${p99}ms`,
    dbBookings: dbBookingCount,
    seatOwner: seatOwnerInDb ? 'Yes (Reserved)' : 'No',
    passed: dbBookingCount === 1 && !doubleBookingDetected && statusCodeCounts['500'] === 0,
  };
}

async function main() {
  try {
    const { show, tokens } = await setupTestEnvironment();
    const showId = show._id;

    console.log(` Target Test Show ID: ${showId}`);
    console.log(` Target Base URL: ${BASE_URL}`);

    const concurrencySteps = [
      { concurrency: 50, seat: 'T_SEAT_50' },
      { concurrency: 100, seat: 'T_SEAT_100' },
      { concurrency: 500, seat: 'T_SEAT_500' },
      { concurrency: 1000, seat: 'T_SEAT_1000' },
    ];

    const results = [];

    for (const step of concurrencySteps) {
      const summary = await runConcurrencyTestForSeat({
        showId,
        targetSeat: step.seat,
        concurrency: step.concurrency,
        tokens,
      });
      results.push(summary);
    }

    // Print Final Comparative Summary
    console.log('\n\n========================================================================================');
    console.log('                          AUTOCANNON LOAD TEST RESULTS SUMMARY                           ');
    console.log('========================================================================================');

    const widths = [13, 9, 13, 13, 10, 10, 10, 10, 12, 10];
    const headers = ['Concurrency', 'Seat', '201 Succeeded', '400 Rejected', '500 Error', 'Mean Lat', 'p95 Lat', 'p99 Lat', 'DB Bookings', 'Verdict'];

    console.log(formatRow(headers, widths));
    console.log('-'.repeat(widths.reduce((a, b) => a + b + 3, 0)));

    for (const r of results) {
      const row = [
        `c=${r.concurrency}`,
        r.seat,
        `${r.success201} (target: 1)`,
        `${r.rejected400}`,
        `${r.errors500}`,
        r.meanLatency,
        r.p95,
        r.p99,
        `${r.dbBookings} in DB`,
        r.passed ? 'PASSED ' : 'FAILED ❌',
      ];
      console.log(formatRow(row, widths));
    }

    console.log('========================================================================================');

    const allPassed = results.every((r) => r.passed);
    if (allPassed) {
      console.log(' ATOMICITY VERIFIED: 0% Double-Booking! Redis SETNX successfully blocked all concurrent race conditions.');
    } else {
      console.warn('⚠️ WARNING: Concurrency race condition detected or request failed.');
    }

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Load test execution failed:', error);
    process.exit(1);
  }
}

main();

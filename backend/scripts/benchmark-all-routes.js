import autocannon from 'autocannon';
import dotenv from 'dotenv';
import connectDB from '../configs/db.js';
import Show from '../models/showModel.js';

dotenv.config();

const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
const DURATION = 10; // 10 seconds per test stage

async function main() {
  console.log('Connecting to database to discover active routes...');
  await connectDB();

  const sampleShow = await Show.findOne().lean();
  const showId = sampleShow?._id ? sampleShow._id.toString() : '68664b3d262e9a5920405712';

  const routesToTest = [
    {
      name: '1. Root Health Check (Static / JSON)',
      path: '/',
      method: 'GET',
      connections: 100,
    },
    {
      name: '2. Fetch Occupied Seats (MongoDB Read)',
      path: `/api/booking/seats/${showId}`,
      method: 'GET',
      connections: 100,
    },
    {
      name: '3. Browse Active Shows (Database / Cached)',
      path: '/api/show/active',
      method: 'GET',
      connections: 100,
    },
    {
      name: '4. Cached Recommendations Route',
      path: '/api/recommendations/active_shows',
      method: 'GET',
      connections: 100,
    },
  ];

  console.log('\n========================================================================================');
  console.log(`         SHOWTIME MULTI-ROUTE LOAD TEST & BENCHMARK (${BASE_URL})`);
  console.log('========================================================================================\n');

  for (const route of routesToTest) {
    console.log(`▶ Testing "${route.name}" with ${route.connections} concurrent users for ${DURATION}s...`);

    const result = await autocannon({
      url: `${BASE_URL}${route.path}`,
      method: route.method,
      connections: route.connections,
      duration: DURATION,
      headers: route.headers || {},
      body: route.body || undefined,
    });

    console.log(`   - Throughput   : ${result.requests.average || 0} requests/sec (Total: ${result.requests.total || 0})`);
    console.log(`   - Mean Latency : ${result.latency.average || 0} ms`);
    console.log(`   - p50 (Median) : ${result.latency.p50 || 0} ms`);
    console.log(`   - p95 Latency  : ${result.latency.p95 || 0} ms`);
    console.log(`   - p99 Latency  : ${result.latency.p99 || 0} ms`);
    console.log(`   - 2xx Success  : ${result['2xx'] || 0} | Non-2xx/Errors: ${(result['4xx'] || 0) + (result['5xx'] || 0)}\n`);
  }

  console.log('========================================================================================');
  console.log('Route benchmark completed successfully!');
  console.log('========================================================================================\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

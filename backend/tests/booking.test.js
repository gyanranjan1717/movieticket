import request from 'supertest';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import app from '../server.js';
import mongoose from 'mongoose';
import Show from '../models/showModel.js';
import User from '../models/User.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'movieticket_super_secret_jwt_key_2026';

describe('3. Booking & Concurrency Protection Endpoints', () => {
  let authToken;
  let testShowId;
  const uniqueTestSeat = 'JEST_SEAT_' + Date.now().toString().slice(-6);

  beforeAll(async () => {
    // 1. Ensure test User exists in database so protectUser middleware verifies it
    const testUserId = 'test_jest_user_id_1';
    let testUser = await User.findById(testUserId);
    if (!testUser) {
      testUser = await User.create({
        _id: testUserId,
        name: 'Jest Test User',
        email: 'jest_test_user@example.com',
        role: 'user'
      });
    }

    // 2. Generate valid test JWT
    authToken = jwt.sign(
      { userId: testUser._id, email: testUser.email, role: testUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Ensure test Show exists in database
    let show = await Show.findOne();
    if (!show) {
      show = await Show.create({
        movie: new mongoose.Types.ObjectId(),
        showDateTime: new Date(Date.now() + 86400000),
        showPrice: 15,
        occupiedSeats: {}
      });
    }
    testShowId = show._id.toString();
  });

  it('POST /api/booking/create should reject requests without Authorization token with 401', async () => {
    const res = await request(app)
      .post('/api/booking/create')
      .send({
        showId: testShowId,
        selectedSeats: ['A1'],
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Authorization token required');
  });

  it('POST /api/booking/create should reject requests with invalid/tampered token with 401', async () => {
    const res = await request(app)
      .post('/api/booking/create')
      .set('Authorization', 'Bearer tampered_invalid_token_123')
      .send({
        showId: testShowId,
        selectedSeats: ['A1'],
      });

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
    expect(typeof res.body.bookingId).toBe('string');
    expect(res.body.url).toContain('checkout.stripe.com');
  });

  it('POST /api/booking/create should reject duplicate booking on the exact same seat with 400', async () => {
    // Immediately attempt to re-book the same seat that was just booked
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

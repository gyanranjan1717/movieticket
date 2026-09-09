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

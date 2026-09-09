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

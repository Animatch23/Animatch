import request from 'supertest';
import app from '../server.js';

describe('Backend API Tests', () => {
  afterAll(async () => {
    // Force Jest to exit by closing any open handles
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('should respond to /api/test route', async () => {
    const response = await request(app).get('/api/test');
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Backend API is working');
  });

  it('should have CORS enabled', async () => {
    const response = await request(app).get('/api/test');
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should handle 404 for non-existent routes', async () => {
    const response = await request(app).get('/api/nonexistent');
    expect(response.statusCode).toBe(404);
  });
});
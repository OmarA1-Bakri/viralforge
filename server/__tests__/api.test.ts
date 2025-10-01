import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';

let app: express.Express;
let authToken: string;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  await registerRoutes(app);
});

describe('API Integration Tests', () => {
  describe('Health Checks', () => {
    it('GET /health should return ok', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('GET /ready should check dependencies', async () => {
      const response = await request(app).get('/ready');
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body.checks).toBeDefined();
      expect(response.body.checks.database).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('POST /api/auth/register should create user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: `testuser_${Date.now()}`,
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      
      authToken = response.body.token;
    });

    it('POST /api/auth/login should authenticate user', async () => {
      const username = `logintest_${Date.now()}`;
      const password = 'TestPassword123!';

      // Register first
      await request(app)
        .post('/api/auth/register')
        .send({ username, password });

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username, password });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrong',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Content Analysis (Protected)', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/content/analyze')
        .send({
          title: 'Test title',
          platform: 'tiktok',
        });

      expect(response.status).toBe(401);
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/content/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          title: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit AI analysis requests', async () => {
      const requests = [];
      
      // Make 12 requests (limit is 10/min)
      for (let i = 0; i < 12; i++) {
        requests.push(
          request(app)
            .post('/api/content/analyze')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Test ${i}`,
              platform: 'tiktok',
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 15000);
  });
});

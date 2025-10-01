import { describe, it, expect } from '@jest/globals';
import { generateToken, verifyToken, hashPassword, comparePassword } from '../auth';

describe('Authentication', () => {
  describe('JWT Token', () => {
    it('should generate and verify valid token', () => {
      const user = { id: 'test-user-123', username: 'testuser' };
      const token = generateToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.id).toBe(user.id);
      expect(decoded?.username).toBe(user.username);
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const decoded = verifyToken(invalidToken);
      
      expect(decoded).toBeNull();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password and verify correctly', async () => {
      const password = 'testPassword123!';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      
      const isValid = await comparePassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hashed = await hashPassword(password);
      
      const isValid = await comparePassword(wrongPassword, hashed);
      expect(isValid).toBe(false);
    });
  });
});

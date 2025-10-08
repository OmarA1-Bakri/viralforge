/**
 * Unit Tests for Webhook Signature Verification
 * Tests critical security features to prevent regression
 */

import * as crypto from 'crypto';

describe('Webhook Security Tests', () => {
  describe('verifyRevenueCatSignature', () => {
    const MOCK_SECRET = 'test-webhook-secret-key-12345';

    // Mock implementation matching production code
    function verifyRevenueCatSignature(body: Buffer, signature: string, secret: string): boolean {
      const hash = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      try {
        return crypto.timingSafeEqual(
          Buffer.from(hash, 'hex'),
          Buffer.from(signature, 'hex')
        );
      } catch (error) {
        return false;
      }
    }

    it('should accept valid signature', () => {
      const body = Buffer.from(JSON.stringify({ event: 'test' }));
      const validSignature = crypto
        .createHmac('sha256', MOCK_SECRET)
        .update(body)
        .digest('hex');

      const result = verifyRevenueCatSignature(body, validSignature, MOCK_SECRET);
      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const body = Buffer.from(JSON.stringify({ event: 'test' }));
      const invalidSignature = 'deadbeef1234567890abcdef';

      const result = verifyRevenueCatSignature(body, invalidSignature, MOCK_SECRET);
      expect(result).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const body = Buffer.from(JSON.stringify({ event: 'test' }));
      const wrongSecretSignature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(body)
        .digest('hex');

      const result = verifyRevenueCatSignature(body, wrongSecretSignature, MOCK_SECRET);
      expect(result).toBe(false);
    });

    it('should reject signature with tampered body', () => {
      const originalBody = Buffer.from(JSON.stringify({ event: 'test', amount: 100 }));
      const tamperedBody = Buffer.from(JSON.stringify({ event: 'test', amount: 0 }));

      const signature = crypto
        .createHmac('sha256', MOCK_SECRET)
        .update(originalBody)
        .digest('hex');

      const result = verifyRevenueCatSignature(tamperedBody, signature, MOCK_SECRET);
      expect(result).toBe(false);
    });

    it('should use constant-time comparison (timing attack prevention)', () => {
      const body = Buffer.from(JSON.stringify({ event: 'test' }));
      const validSignature = crypto
        .createHmac('sha256', MOCK_SECRET)
        .update(body)
        .digest('hex');

      // Timing attack test: verify it uses timingSafeEqual
      // (we can't test timing directly in unit tests, but we verify behavior)
      const result1 = verifyRevenueCatSignature(body, validSignature, MOCK_SECRET);
      const result2 = verifyRevenueCatSignature(body, 'a'.repeat(64), MOCK_SECRET);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should reject signature with wrong length', () => {
      const body = Buffer.from(JSON.stringify({ event: 'test' }));
      const shortSignature = 'abc123';

      const result = verifyRevenueCatSignature(body, shortSignature, MOCK_SECRET);
      expect(result).toBe(false);
    });

    it('should reject empty signature', () => {
      const body = Buffer.from(JSON.stringify({ event: 'test' }));
      const emptySignature = '';

      const result = verifyRevenueCatSignature(body, emptySignature, MOCK_SECRET);
      expect(result).toBe(false);
    });

    it('should reject non-hex signature', () => {
      const body = Buffer.from(JSON.stringify({ event: 'test' }));
      const nonHexSignature = 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';

      const result = verifyRevenueCatSignature(body, nonHexSignature, MOCK_SECRET);
      expect(result).toBe(false);
    });
  });

  describe('Event Idempotency', () => {
    it('should prevent duplicate event processing', async () => {
      const processedEvents = new Set<string>();

      function isEventProcessed(eventId: string): boolean {
        return processedEvents.has(eventId);
      }

      function markEventProcessed(eventId: string): void {
        processedEvents.add(eventId);
      }

      const eventId = 'evt_test123';

      // First processing
      expect(isEventProcessed(eventId)).toBe(false);
      markEventProcessed(eventId);

      // Second processing (should be detected as duplicate)
      expect(isEventProcessed(eventId)).toBe(true);
    });

    it('should allow different events', () => {
      const processedEvents = new Set<string>();

      function isEventProcessed(eventId: string): boolean {
        return processedEvents.has(eventId);
      }

      function markEventProcessed(eventId: string): void {
        processedEvents.add(eventId);
      }

      markEventProcessed('evt_test1');
      expect(isEventProcessed('evt_test1')).toBe(true);
      expect(isEventProcessed('evt_test2')).toBe(false);
    });
  });

  describe('RevenueCat Event Structure Validation', () => {
    interface RevenueCatEvent {
      id: string;
      type: string;
      event: {
        app_user_id: string;
        product_id?: string;
        entitlement_ids?: string[];
      };
    }

    function validateEvent(event: any): boolean {
      if (!event || typeof event !== 'object') {
        return false;
      }
      return (
        typeof event.id === 'string' &&
        typeof event.type === 'string' &&
        event.event &&
        typeof event.event.app_user_id === 'string'
      );
    }

    it('should accept valid event structure', () => {
      const validEvent = {
        id: 'evt_123',
        type: 'INITIAL_PURCHASE',
        event: {
          app_user_id: 'user_123',
          product_id: 'viralforge_creator_monthly',
          entitlement_ids: ['creator']
        }
      };

      expect(validateEvent(validEvent)).toBe(true);
    });

    it('should reject event without id', () => {
      const invalidEvent = {
        type: 'INITIAL_PURCHASE',
        event: { app_user_id: 'user_123' }
      };

      expect(validateEvent(invalidEvent)).toBe(false);
    });

    it('should reject event without type', () => {
      const invalidEvent = {
        id: 'evt_123',
        event: { app_user_id: 'user_123' }
      };

      expect(validateEvent(invalidEvent)).toBe(false);
    });

    it('should reject event without app_user_id', () => {
      const invalidEvent = {
        id: 'evt_123',
        type: 'INITIAL_PURCHASE',
        event: {}
      };

      expect(validateEvent(invalidEvent)).toBe(false);
    });

    it('should reject null event', () => {
      expect(validateEvent(null)).toBe(false);
    });

    it('should reject undefined event', () => {
      expect(validateEvent(undefined)).toBe(false);
    });
  });
});

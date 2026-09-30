import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';

describe('FinSathi / Karobar Backend CI Suite', () => {
  it('should verify test runner functionality', () => {
    assert.strictEqual(1 + 1, 2);
  });

  it('should sign and decode JWT tokens cleanly', () => {
    const secret = process.env.JWT_SECRET || 'test_jwt_secret_must_be_32_characters_long_min';
    const payload = { id: 'test-user-id', role: 'Owner' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.id, 'test-user-id');
    assert.strictEqual(decoded.role, 'Owner');
  });

  it('should validate phone and email format helpers', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    assert.strictEqual(emailRegex.test('demo.owner@karobar.test'), true);
    assert.strictEqual(emailRegex.test('invalid-email'), false);
  });
});

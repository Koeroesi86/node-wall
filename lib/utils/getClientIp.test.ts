import { afterEach, expect, test, vi } from 'vitest';
import getClientIp from './getClientIp';

afterEach(() => vi.unstubAllEnvs());

test('uses the last forwarded address when the peer is a trusted proxy', () => {
  expect(getClientIp({ remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' } })).toBe('203.0.113.9');
});

test('ignores the header when the peer is not a trusted proxy', () => {
  expect(getClientIp({ remoteAddress: '198.51.100.1', headers: { 'x-forwarded-for': '203.0.113.9' } })).toBe('198.51.100.1');
});

test('falls back to the peer without the header', () => {
  expect(getClientIp({ remoteAddress: '127.0.0.1', headers: {} })).toBe('127.0.0.1');
});

test('honours TRUSTED_PROXIES', () => {
  vi.stubEnv('TRUSTED_PROXIES', '10.0.0.1');
  expect(getClientIp({ remoteAddress: '10.0.0.1', headers: { 'x-forwarded-for': '203.0.113.9' } })).toBe('203.0.113.9');
  expect(getClientIp({ remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': '203.0.113.9' } })).toBe('127.0.0.1');
});

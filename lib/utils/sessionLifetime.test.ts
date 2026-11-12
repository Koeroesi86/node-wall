import { expect, test } from 'vitest';
import { isSessionExpired, SESSION_IDLE_TIMEOUT_MS, SESSION_MAX_AGE_MS, toSqliteTimestamp } from './sessionLifetime';

const now = Date.UTC(2026, 0, 31);
const day = 24 * 60 * 60 * 1000;

test('toSqliteTimestamp matches CURRENT_TIMESTAMP format', () => {
  expect(toSqliteTimestamp(Date.UTC(2026, 0, 2, 3, 4, 5))).toBe('2026-01-02 03:04:05');
});

test('a fresh session is valid', () => {
  expect(isSessionExpired({ created_at: toSqliteTimestamp(now - day), last_active: now - 1000 }, now)).toBe(false);
});

test('expires after the absolute lifetime even when active', () => {
  expect(isSessionExpired({ created_at: toSqliteTimestamp(now - SESSION_MAX_AGE_MS - day), last_active: now }, now)).toBe(true);
});

test('expires after the idle timeout', () => {
  expect(isSessionExpired({ created_at: toSqliteTimestamp(now - 10 * day), last_active: now - SESSION_IDLE_TIMEOUT_MS - day }, now)).toBe(true);
});

test('falls back to created_at when never active', () => {
  expect(isSessionExpired({ created_at: toSqliteTimestamp(now - day), last_active: null }, now)).toBe(false);
  expect(isSessionExpired({ created_at: toSqliteTimestamp(now - SESSION_IDLE_TIMEOUT_MS - day), last_active: null }, now)).toBe(true);
});

test('unreadable timestamps count as expired', () => {
  expect(isSessionExpired({ created_at: undefined }, now)).toBe(true);
});

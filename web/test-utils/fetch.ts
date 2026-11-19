import { vi } from 'vitest';

export interface Call {
  method: string;
  url: string;
  body?: unknown;
}

/**
 * Replaces `fetch`: every call is recorded, and answers come from `routes` (keyed "METHOD url"),
 * defaulting to an empty 200.
 */
export const fakeFetch = (routes: Record<string, { status?: number; body?: unknown }> = {}) => {
  const calls: Call[] = [];

  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ method, url, body: init.body });
    const { status = 200, body } = routes[`${method} ${url}`] ?? {};

    return new Response(body === undefined ? '' : JSON.stringify(body), { status });
  }));

  return calls;
};

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { LambdaEvent, LambdaResponse } from '../../../lib/types';
import getTranslation from '../../../lib/translations/getTranslation';

vi.mock('../../../lib/translations/getTranslation');

const request = async (handler: (event: LambdaEvent, callback: (response: LambdaResponse) => void) => Promise<unknown>, event: Partial<LambdaEvent>) => {
  const responses: LambdaResponse[] = [];
  await handler({ httpMethod: 'GET', pathFragments: ['api', 'translation', 'alias'], headers: {}, bodyStream: undefined as never, ...event }, response => responses.push(response));
  return responses;
};

let handler: Parameters<typeof request>[0];

beforeEach(async () => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.resetModules();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  handler = (await import('./index')).default;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('returns the translation in the requested language', async () => {
  vi.mocked(getTranslation).mockResolvedValue({ value: 'Szia' });

  const [response] = await request(handler, { headers: { 'accept-language': 'hu-HU,hu;q=0.9' } });

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body ?? '')).toEqual({ value: 'Szia' });
  expect(getTranslation).toHaveBeenCalledWith('alias', 'hu-HU');
});

test('defaults to en-GB', async () => {
  vi.mocked(getTranslation).mockResolvedValue({ value: 'Hi' });
  await request(handler, {});
  expect(getTranslation).toHaveBeenCalledWith('alias', 'en-GB');
});

test('answers OPTIONS without reading translations', async () => {
  const [response] = await request(handler, { httpMethod: 'OPTIONS' });
  expect(response).toMatchObject({ statusCode: 200, body: '' });
  expect(getTranslation).not.toHaveBeenCalled();
});

test('answers 400 when reading fails', async () => {
  vi.mocked(getTranslation).mockRejectedValue(new Error('broken'));
  const [response] = await request(handler, {});
  expect(response.statusCode).toBe(400);
});

test('does not answer other paths or methods', async () => {
  expect(await request(handler, { pathFragments: ['api', 'translation'] })).toEqual([]);
  expect(await request(handler, { httpMethod: 'POST' })).toEqual([]);
});

test('shuts down after five minutes of inactivity', async () => {
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
  expect(exit).toHaveBeenCalledWith(0);
});

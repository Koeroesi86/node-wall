// @vitest-environment jsdom
import { act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { fakeFetch } from '../test-utils/fetch.ts';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { AuditLog } from './audit-log.tsx';

const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

afterEach(cleanup);

test('lists recent entries', async () => {
  const calls = fakeFetch({
    'GET /api/users/audit': { body: [{ user_id: 'u1', user_name: 'Ann', action: 'tag.created', target_id: 't1', request_id: 'r1', created_at: 1 }] },
  });
  const { container } = render(<AuditLog />);
  await flush();

  expect(calls[0]).toMatchObject({ method: 'GET', url: '/api/users/audit' });
  const row = container.querySelector('.entry');
  expect(row?.querySelector('.action')?.textContent).toBe('audit-log.action.tag.created');
  expect(row?.querySelector('.actor')?.textContent).toBe('Ann');
  expect(row?.querySelector('.actor')?.getAttribute('title')).toBe('t1');
});

test('says when there are no entries', async () => {
  fakeFetch({ 'GET /api/users/audit': { body: [] } });
  const { container } = render(<AuditLog />);
  await flush();

  expect(container.querySelector('.list')?.textContent).toBe('audit-log.empty');
});

// @vitest-environment jsdom
import { act, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { fakeFetch } from '../test-utils/fetch.ts';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { UserRoles } from './user-roles.tsx';

const users = [
  { id: 'u1', name: 'Ann', role: 'admin', created_at: 1 },
  { id: 'u2', name: null, role: 'user', created_at: 2 },
];

const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
const mount = async () => {
  const calls = fakeFetch({ 'GET /api/users': { body: users } });
  const { container } = render(<UserRoles />);
  await flush();

  return { element: container.firstElementChild as HTMLElement, calls };
};
const toggle = (element: HTMLElement, index: number) => fireEvent.click(element.querySelectorAll('.user')[index].querySelector('.toggle') as HTMLElement);

afterEach(() => {
  cleanup();
});

describe('user-roles', () => {
  test('lists users with their roles', async () => {
    const { element, calls } = await mount();

    expect(calls[0]).toMatchObject({ method: 'GET', url: '/api/users' });
    const rows = [...element.querySelectorAll('.user')];
    expect(rows.map(row => row.querySelector('.name')?.textContent)).toEqual(['Ann', 'u2']);
    expect(rows.map(row => row.querySelector('.role')?.textContent)).toEqual(['admin', 'user']);
  });

  test('promotes a user and reloads the list', async () => {
    const { element, calls } = await mount();
    calls.length = 0;

    toggle(element, 1);
    await flush();

    expect(calls[0]).toMatchObject({ method: 'PUT', url: '/api/users/u2', body: JSON.stringify({ role: 'admin' }) });
    expect(calls[1]).toMatchObject({ method: 'GET', url: '/api/users' });
  });

  test('demotes an admin', async () => {
    const { element, calls } = await mount();
    calls.length = 0;

    toggle(element, 0);
    await flush();

    expect(calls[0]).toMatchObject({ method: 'PUT', url: '/api/users/u1', body: JSON.stringify({ role: 'user' }) });
  });
});

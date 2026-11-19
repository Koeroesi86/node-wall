// @vitest-environment jsdom
import { cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { LoginPage } from './login-page.tsx';

interface Request {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

const requests: Request[] = [];

class FakeXhr {
  readyState = 0;
  onreadystatechange?: () => void;
  private request: Request = { method: '', url: '', headers: {}, body: undefined };

  open(method: string, url: string) {
    Object.assign(this.request, { method, url });
  }

  setRequestHeader(name: string, value: string) {
    this.request.headers[name] = value;
  }

  send(body: unknown) {
    this.request.body = body;
    requests.push(this.request);
  }
}

const mount = (session?: string, translations?: Record<string, string>) => render(<LoginPage session={session} />, translations).container.firstElementChild as HTMLElement;
const submit = (form: Element | null) => fireEvent.submit(form as Element);
const type = (input: Element | null, value: string) => fireEvent.change(input as Element, { target: { value } });

beforeEach(() => {
  requests.length = 0;
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('login-page', () => {
  test('offers to create a session when there is none', () => {
    const element = mount();

    expect(element.querySelector('.createSession')?.classList.contains('hidden')).toBe(false);
    expect(element.querySelector('.activateSession')?.classList.contains('hidden')).toBe(true);
  });

  test('offers to activate the session named in the url', () => {
    const element = mount('abc');

    expect(element.querySelector('.activateSession')?.classList.contains('hidden')).toBe(false);
    expect(element.querySelector('.createSession')?.classList.contains('hidden')).toBe(true);
  });

  test('sets the input placeholders from translations', () => {
    const element = mount('abc', {
      'login-page.activate-session.input.placeholder': 'Code',
      'login-page.create-session.input.placeholder': 'Email',
    });

    expect(element.querySelector('.activateSession .input')?.getAttribute('placeholder')).toBe('Code');
    expect(element.querySelector('.createSession .input')?.getAttribute('placeholder')).toBe('Email');
  });

  test('posts the email to start a login', () => {
    const element = mount();
    type(element.querySelector('.createSession .input'), 'a@b.c');

    submit(element.querySelector('.createSession form'));

    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: '/api/user',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', value: 'a@b.c' }),
    });
  });

  test('does not post an empty email', () => {
    const element = mount();

    submit(element.querySelector('.createSession form'));

    expect(requests).toHaveLength(0);
  });

  test('posts the code with the pending session to activate it', () => {
    const sessionId = 'aaaaaaaa-0000-0000-0000-000000000000';
    const element = mount(sessionId);
    type(element.querySelector('.activateSession .input'), 'ABC123');

    submit(element.querySelector('.activateSession form'));

    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: '/login/email',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: sessionId, code: 'ABC123' }),
    });
  });

  test.each([
    ['a code of the wrong length', 'ABC'],
    ['lowercase characters', 'abc123'],
  ])('does not post %s', (_name, code) => {
    const element = mount('aaaaaaaa-0000-0000-0000-000000000000');
    type(element.querySelector('.activateSession .input'), code);

    submit(element.querySelector('.activateSession form'));

    expect(requests).toHaveLength(0);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInContext } from 'node:vm';
import { JSDOM } from 'jsdom';

const projectRoot = resolve(__dirname, '../..');

export interface FakeRequest {
  method: string;
  url: string;
  async: boolean;
  headers: Record<string, string>;
  body: unknown;
  /** Completes the request the way the browser would, firing `onreadystatechange`. */
  respond: (status: number, body?: unknown, headers?: Record<string, string>) => void;
}

interface Timer {
  id: number;
  callback: () => void;
  delay: number;
}

const compiled = new Map<string, Promise<string>>();

const compile = (file: string) => {
  if (!compiled.has(file)) {
    const path = resolve(projectRoot, file);
    // vite is an ES module, so it is loaded dynamically
    compiled.set(file, import('vite').then(({ transformWithOxc }) => transformWithOxc(readFileSync(path, 'utf8'), path, { lang: 'ts' })).then(result => result.code));
  }

  return compiled.get(file) as Promise<string>;
};

/**
 * Runs the plain browser scripts of `public/static` (no modules, shared globals) inside a jsdom window,
 * the way the page does. XMLHttpRequest and timers are replaced with controllable fakes.
 */
export async function loadBrowser(
  files: string[] = [],
  html = '<!doctype html><html><head></head><body></body></html>',
  prelude = '',
) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
  const { window } = dom;
  const context = dom.getInternalVMContext();
  const requests: FakeRequest[] = [];
  const timers: Timer[] = [];
  let nextTimerId = 1;

  class FakeXhr {
    readyState = 0;
    status = 0;
    responseText = '';
    onreadystatechange?: (event?: unknown) => void;
    onload?: () => void;
    onerror?: () => void;
    private readonly request: FakeRequest;
    private responseHeaders: Record<string, string> = {};

    constructor() {
      this.request = {
        method: '',
        url: '',
        async: true,
        headers: {},
        body: undefined,
        respond: (status, body = '', headers = {}) => {
          this.status = status;
          this.responseText = typeof body === 'string' ? body : JSON.stringify(body);
          this.responseHeaders = headers;
          this.readyState = 4;
          this.onreadystatechange?.();
        },
      };
    }

    open(method: string, url: string, async = true) {
      Object.assign(this.request, { method, url, async });
    }

    setRequestHeader(name: string, value: string) {
      this.request.headers[name] = value;
    }

    getResponseHeader(name: string) {
      return this.responseHeaders[name] ?? null;
    }

    send(body?: unknown) {
      this.request.body = body;
      requests.push(this.request);
    }
  }

  Object.assign(window, {
    XMLHttpRequest: FakeXhr,
    setTimeout: (callback: () => void, delay = 0) => {
      const id = nextTimerId++;
      timers.push({ id, callback, delay });
      return id;
    },
    clearTimeout: (id: number) => {
      const index = timers.findIndex(timer => timer.id === id);
      if (index !== -1) timers.splice(index, 1);
    },
  });

  // jsdom has no layout, so innerText is not implemented; textContent is the closest equivalent.
  Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
    configurable: true,
    get() {
      return this.textContent;
    },
    set(value: string) {
      this.textContent = value;
    },
  });

  const evaluate = <T = never>(code: string, filename = 'test.js'): T => runInContext(code, context, { filename });

  if (prelude) evaluate(prelude, 'prelude.js');

  for (const file of files) {
    evaluate(await compile(file), file);
  }

  return {
    window,
    document: window.document,
    requests,
    evaluate,
    /** Runs (and removes) every pending timer, in scheduling order. */
    flushTimers: () => timers.splice(0).forEach(timer => timer.callback()),
    pendingTimers: () => timers.map(({ id, delay }) => ({ id, delay })),
    close: () => window.close(),
  };
}

export type Browser = Awaited<ReturnType<typeof loadBrowser>>;

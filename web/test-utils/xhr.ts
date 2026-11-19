import { vi } from 'vitest';

export interface FakeRequest {
  method: string;
  url: string;
  async: boolean;
  headers: Record<string, string>;
  body: unknown;
  /** Completes the request the way the browser would, firing `onreadystatechange`. */
  respond: (status: number, body?: unknown, headers?: Record<string, string>) => void;
}

/** Replaces XMLHttpRequest with a fake that records the requests until they are answered with `respond`. */
export const installFakeXhr = () => {
  const requests: FakeRequest[] = [];

  class FakeXhr {
    readyState = 0;
    status = 0;
    responseText = '';
    onreadystatechange?: () => void;
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

  vi.stubGlobal('XMLHttpRequest', FakeXhr);

  return requests;
};

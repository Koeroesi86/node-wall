type Call = unknown[];
type Resolve = (value: unknown) => unknown;

/**
 * A stand-in for a knex instance. Every chained call is recorded as `[method, ...args]`
 * (the `knex('table')` call itself is recorded as `['knex', 'table']`),
 * and awaiting a chain resolves to the configured result.
 */
function createFakeDb() {
  const calls: Call[] = [];
  const state: { result: unknown; queue: unknown[]; error: unknown } = { result: undefined, queue: [], error: undefined };

  const callable = (): void => undefined;
  const chain = (name: string) => (...args: unknown[]) => {
    calls.push([name, ...args]);
    return builder;
  };

  const builder: object = new Proxy(callable, {
    apply: (_target, _this, args) => chain('knex')(...args),
    get: (_target, prop) => {
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'then') {
        return (resolve: Resolve, reject: Resolve) => (state.error === undefined
          ? Promise.resolve(state.queue.length > 0 ? state.queue.shift() : state.result)
          : Promise.reject(state.error)
        ).then(resolve, reject);
      }
      return chain(prop);
    },
  });

  // The knex instance itself must not be thenable, or `await createDatabase()` would unwrap it.
  const knex: object = new Proxy(callable, {
    apply: (_target, _this, args) => chain('knex')(...args),
    get: (_target, prop) => (typeof prop === 'symbol' || prop === 'then' ? undefined : chain(prop)),
  });

  return {
    knex,
    calls,
    resolves: (result: unknown) => {
      state.result = result;
    },
    /** Each awaited chain resolves to the next value; afterwards the `resolves` result applies. */
    resolvesInOrder: (...results: unknown[]) => {
      state.queue = results;
    },
    rejects: (error: unknown) => {
      state.error = error;
    },
    reset: () => {
      calls.length = 0;
      state.result = undefined;
      state.queue = [];
      state.error = undefined;
    },
    /** Invokes a callback passed to a chained call (e.g. `havingExists`) and returns what it recorded. */
    runCallback: (name: string): Call[] => {
      const fn = calls.find(call => call[0] === name)?.[1];
      if (typeof fn !== 'function') throw new Error(`no callback passed to ${name}`);
      const start = calls.length;
      fn.call(builder);
      return calls.slice(start);
    },
  };
}

export const fakeDb = createFakeDb();

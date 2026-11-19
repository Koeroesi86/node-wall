/** `ApiSchemas` without the validation: every schema returns what it is given. */
export const fakeApiSchemas = () => {
  Object.assign(window, {
    ApiSchemas: new Proxy({}, { get: () => ({ parse: (data: unknown) => data }) }),
  });
};

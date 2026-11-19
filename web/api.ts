/** A JSON request; rejects unless the response is a success, and answers the parsed body when there is one. */
export const request = async (method: string, url: string, body?: unknown): Promise<unknown> => {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`${method} ${url} failed with ${response.status}`);

  const text = await response.text();

  return text ? JSON.parse(text) : undefined;
};

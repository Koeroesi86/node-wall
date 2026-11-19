import { resolve } from 'node:path';

export type RenderPage = (name: string, props?: Record<string, unknown>) => string | undefined;

const rendererPath = resolve(__dirname, '../../ssr/entry-server.cjs');

let cached: RenderPage | undefined;

/** The page renderer of the Vite SSR build; `undefined` until `npm run build` has produced it. */
export const loadRenderer = (): RenderPage | undefined => {
  try {
    cached ??= require(rendererPath).renderPage;
  } catch {
    return undefined;
  }

  return cached;
};

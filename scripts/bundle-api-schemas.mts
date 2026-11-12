import { build } from 'vite';

/**
 * Bundles the shared request/response schemas (and the zod they use) into one plain script that defines the
 * `ApiSchemas` global, since the pages load scripts without a module system.
 */
export async function bundleApiSchemas(): Promise<string> {
  const output = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: true,
      lib: { entry: 'lib/api-schemas/index.ts', formats: ['iife'], name: 'ApiSchemas', fileName: () => 'api-schemas.js' },
    },
  });
  const [{ output: [chunk] }] = [output].flat() as { output: { code: string }[] }[];

  return chunk.code;
}

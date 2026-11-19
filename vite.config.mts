import { defineConfig, type Plugin } from 'vite';

/**
 * The server sends the scripts without a charset, so the browser may read them as Latin-1: anything
 * that is not ASCII (a regex range, a typographic character in a text) would arrive as garbage.
 * Escaped, the bundle reads the same in every encoding.
 */
const asciiOnly = (): Plugin => ({
  name: 'ascii-only',
  // after the minifier, which would write the characters out again
  generateBundle: (_options, bundle) => Object.values(bundle).forEach((file) => {
    if (file.type === 'chunk') file.code = file.code.replace(/[^\x00-\x7f]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
  }),
});

/**
 * Vite is only a build tool here (no dev server): the pages are served by nws-cli.
 * `vite build` makes the client bundle, `vite build --ssr` the server rendering entry the backend loads.
 */
export default defineConfig(({ isSsrBuild }) => ({
  base: '/static/app/',
  // `public` holds the server code, not static files to copy into the bundle
  publicDir: false,
  oxc: { jsx: { runtime: 'automatic' } },
  plugins: [asciiOnly()],
  build: isSsrBuild
    ? {
      outDir: 'dist/ssr',
      emptyOutDir: true,
      ssr: 'web/entry-server.ts',
      rollupOptions: { output: { format: 'cjs', entryFileNames: 'entry-server.cjs' } },
    }
    : {
      outDir: 'dist/public/static/app',
      emptyOutDir: true,
      // lets the page templates find the hashed file names
      manifest: true,
      rollupOptions: { input: 'web/entry-client.tsx' },
    },
}));

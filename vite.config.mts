import { defineConfig } from 'vite';

/**
 * Vite is only a build tool here (no dev server): the pages are served by nws-cli.
 * `vite build` makes the client bundle, `vite build --ssr` the server rendering entry the backend loads.
 */
export default defineConfig(({ isSsrBuild }) => ({
  base: '/static/app/',
  // `public` holds the server code, not static files to copy into the bundle
  publicDir: false,
  oxc: { jsx: { runtime: 'automatic' } },
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

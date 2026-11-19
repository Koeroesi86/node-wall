import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    include: ['*.test.ts', 'lib/**/*.test.ts', 'migrations/**/*.test.ts', 'public/**/*.test.ts', 'web/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['*.ts', 'lib/**/*.ts', 'migrations/**/*.ts', 'public/**/*.ts', 'web/**/*.{ts,tsx}'],
      // public/static runs inside jsdom contexts, where v8 cannot attribute coverage to the source files
      exclude: ['**/*.test.ts', '**/*.d.ts', 'lib/test-utils/**', 'public/static/**'],
    },
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.spec.ts', 'apps/server/src/**/*.spec.ts'],
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    passWithNoTests: true,
  },
});

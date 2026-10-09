import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  workers: 2, // ambiente compartilhado com outros candidatos: sem paralelismo agressivo
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://verzel-store.qa-test-verzel-store.workers.dev',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});

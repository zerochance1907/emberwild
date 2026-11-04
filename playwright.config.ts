import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:4173/emberwild/',
    viewport: { width: 960, height: 540 },
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/emberwild/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

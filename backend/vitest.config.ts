import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Integration tests share one database.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://subtrack:subtrack@localhost:5440/subtrack_test',
      ANTHROPIC_API_KEY: '',
    },
  },
});

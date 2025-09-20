import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{js,ts}'],
    globals: true,
    reporters: 'default',
  },
});

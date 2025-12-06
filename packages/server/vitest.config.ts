import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
     env: {
       AUTH_TOKEN_HMAC_SECRET: 'test-token-secret',
       AUTH_JWT_SECRET: 'test-jwt-secret',
       AUTH_REFRESH_SECRET: 'test-refresh-secret'
     },
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
});

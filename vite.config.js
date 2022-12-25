import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    deps: { interopDefault: true },
    exclude: ['**/node_modules/**', '**/dist/**', '**/benchmarks/**', '**/.{idea,git,cache,output,temp}/**']
  }
});

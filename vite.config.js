import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/benchmarks/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
  },
});

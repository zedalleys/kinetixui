/// <reference types="vitest" />
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

/**
 * Angular tests run through the Analog plugin, which puts Vite (and therefore Vitest, already the runner for
 * @kinetixui/ui and the web app) in front of the Angular compiler. That keeps one test runner across the
 * repository instead of adding Karma or Jest for one package.
 */
export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
  },
  define: { 'import.meta.vitest': 'undefined' },
});

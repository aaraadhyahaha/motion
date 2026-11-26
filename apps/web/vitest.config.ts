import { defineProject } from 'vitest/config';

// Pure-logic unit tests in node (no DOM dependency): browser globals are injected/stubbed per test.
export default defineProject({ test: { name: 'web', include: ['src/**/*.test.ts'], environment: 'node' } });

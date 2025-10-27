/**
 * Test setup file
 * Runs before all tests
 */

// Polyfill crypto for Node.js environment
import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

// Setup console for better test output
globalThis.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: process.env.VERBOSE_TESTS ? console.log : () => {},
};

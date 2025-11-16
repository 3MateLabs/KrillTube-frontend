/**
 * Safe localStorage wrapper for SSR compatibility
 * Provides a mock Storage object when running on the server
 */

export const safeLocalStorage: Storage = typeof window !== 'undefined'
  ? localStorage
  : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as Storage;

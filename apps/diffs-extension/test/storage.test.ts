import { describe, expect, test } from 'bun:test';

import {
  createExtensionStorage,
  DEFAULT_CONFIG,
  toggleEnabled,
} from '../src/lib/storage';

class MemoryStorageArea {
  readonly values = new Map<string, unknown>();

  get(key: string): Promise<Record<string, unknown>> {
    return Promise.resolve({ [key]: this.values.get(key) });
  }

  set(values: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(values)) {
      this.values.set(key, value);
    }
    return Promise.resolve();
  }
}

describe('extension storage', () => {
  test('defaults to enabled config', async () => {
    const storage = createExtensionStorage(new MemoryStorageArea());

    expect(await storage.getConfig()).toEqual(DEFAULT_CONFIG);
  });

  test('toggles enabled config', async () => {
    const storage = createExtensionStorage(new MemoryStorageArea());

    expect(await toggleEnabled(storage)).toEqual({
      enabled: false,
    });
    expect(await toggleEnabled(storage)).toEqual(DEFAULT_CONFIG);
  });
});

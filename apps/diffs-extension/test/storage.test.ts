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

  remove(key: string): Promise<void> {
    this.values.delete(key);
    return Promise.resolve();
  }
}

function createMemoryStorage() {
  const local = new MemoryStorageArea();
  const sync = new MemoryStorageArea();
  return {
    local,
    storage: createExtensionStorage({ local, sync }),
    sync,
  };
}

describe('extension storage', () => {
  test('defaults to enabled prod config', async () => {
    const { storage } = createMemoryStorage();

    const config = await storage.getConfig();

    expect(config).toEqual(DEFAULT_CONFIG);
  });

  test('stores PAT in local storage only', async () => {
    const { local, storage, sync } = createMemoryStorage();

    await storage.setToken('  github_pat_saved  ');

    const token = await storage.getToken();

    expect(token).toBe('github_pat_saved');
    expect(local.values.has('diffs-extension.githubPat')).toBe(true);
    expect(sync.values.has('diffs-extension.githubPat')).toBe(false);
  });

  test('toggles enabled config', async () => {
    const { storage } = createMemoryStorage();

    const disabledConfig = await toggleEnabled(storage);
    const enabledConfig = await toggleEnabled(storage);

    expect(disabledConfig).toEqual({
      enabled: false,
      target: 'prod',
    });
    expect(enabledConfig).toEqual(DEFAULT_CONFIG);
  });
});

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

  test('stores separate PATs in local storage only', async () => {
    const { local, storage, sync } = createMemoryStorage();

    await storage.setToken('prod', '  github_pat_prod  ');
    await storage.setToken('local', '  github_pat_local  ');

    const prodToken = await storage.getToken('prod');
    const localToken = await storage.getToken('local');

    expect(prodToken).toBe('github_pat_prod');
    expect(localToken).toBe('github_pat_local');
    expect(local.values.has('diffs-extension.githubPat.prod')).toBe(true);
    expect(local.values.has('diffs-extension.githubPat.local')).toBe(true);
    expect(sync.values.has('diffs-extension.githubPat.prod')).toBe(false);
    expect(sync.values.has('diffs-extension.githubPat.local')).toBe(false);
  });

  test('clears the legacy PAT when clearing production PAT', async () => {
    const { local, storage } = createMemoryStorage();
    local.values.set('diffs-extension.githubPat', 'github_pat_legacy');

    await storage.clearToken('prod');

    expect(await storage.getToken('prod')).toBe('');
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

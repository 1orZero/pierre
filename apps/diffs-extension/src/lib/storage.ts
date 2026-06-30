import {
  DEFAULT_CONFIG,
  type ExtensionConfig,
  type ExtensionTarget,
  STORAGE_KEYS,
} from './config';

export { DEFAULT_CONFIG, type ExtensionConfig, type ExtensionTarget };

export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface ExtensionStorage {
  clearToken(target: ExtensionTarget): Promise<void>;
  getConfig(): Promise<ExtensionConfig>;
  getToken(target: ExtensionTarget): Promise<string>;
  setConfig(config: ExtensionConfig): Promise<void>;
  setToken(target: ExtensionTarget, token: string): Promise<void>;
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getTokenKey(target: ExtensionTarget): string {
  return target === 'local' ? STORAGE_KEYS.tokenLocal : STORAGE_KEYS.tokenProd;
}

function normalizeConfig(value: unknown): ExtensionConfig {
  if (value == null || typeof value !== 'object') {
    return DEFAULT_CONFIG;
  }

  const partial = value as Partial<ExtensionConfig>;
  return {
    enabled:
      typeof partial.enabled === 'boolean'
        ? partial.enabled
        : DEFAULT_CONFIG.enabled,
    target: partial.target === 'local' ? 'local' : DEFAULT_CONFIG.target,
  };
}

export function createExtensionStorage(areas: {
  local: StorageArea;
  sync: StorageArea;
}): ExtensionStorage {
  return {
    async clearToken(target) {
      await areas.local.remove(getTokenKey(target));
      if (target === 'prod') {
        await areas.local.remove(STORAGE_KEYS.token);
      }
    },
    async getConfig() {
      const data = await areas.sync.get(STORAGE_KEYS.config);
      return normalizeConfig(data[STORAGE_KEYS.config]);
    },
    async getToken(target) {
      const data = await areas.local.get(getTokenKey(target));
      const token = normalizeToken(data[getTokenKey(target)]);
      if (token !== '' || target === 'local') return token;

      const legacyData = await areas.local.get(STORAGE_KEYS.token);
      return normalizeToken(legacyData[STORAGE_KEYS.token]);
    },
    async setConfig(config) {
      await areas.sync.set({ [STORAGE_KEYS.config]: normalizeConfig(config) });
    },
    async setToken(target, token) {
      const normalized = normalizeToken(token);
      const tokenKey = getTokenKey(target);
      if (normalized === '') {
        await areas.local.remove(tokenKey);
        return;
      }
      await areas.local.set({ [tokenKey]: normalized });
    },
  };
}

export function getExtensionStorage(): ExtensionStorage {
  return createExtensionStorage({
    local: chrome.storage.local,
    sync: chrome.storage.sync,
  });
}

export async function toggleEnabled(
  storage: Pick<ExtensionStorage, 'getConfig' | 'setConfig'>
): Promise<ExtensionConfig> {
  const current = await storage.getConfig();
  const next = { ...current, enabled: !current.enabled };
  await storage.setConfig(next);
  return next;
}

import { DEFAULT_CONFIG, type ExtensionConfig, STORAGE_KEYS } from './config';

export { DEFAULT_CONFIG, type ExtensionConfig };

export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
}

export interface ExtensionStorage {
  getConfig(): Promise<ExtensionConfig>;
  setConfig(config: ExtensionConfig): Promise<void>;
}

function normalizeConfig(value: unknown): ExtensionConfig {
  if (value == null || typeof value !== 'object') return DEFAULT_CONFIG;

  const partial = value as Partial<ExtensionConfig>;
  return {
    enabled:
      typeof partial.enabled === 'boolean'
        ? partial.enabled
        : DEFAULT_CONFIG.enabled,
  };
}

export function createExtensionStorage(area: StorageArea): ExtensionStorage {
  return {
    async getConfig() {
      const data = await area.get(STORAGE_KEYS.config);
      return normalizeConfig(data[STORAGE_KEYS.config]);
    },
    async setConfig(config) {
      await area.set({ [STORAGE_KEYS.config]: normalizeConfig(config) });
    },
  };
}

export function getExtensionStorage(): ExtensionStorage {
  return createExtensionStorage(chrome.storage.sync);
}

export async function toggleEnabled(
  storage: Pick<ExtensionStorage, 'getConfig' | 'setConfig'>
): Promise<ExtensionConfig> {
  const current = await storage.getConfig();
  const next = { ...current, enabled: !current.enabled };
  await storage.setConfig(next);
  return next;
}

export const STORAGE_KEYS = {
  config: 'diffs-extension.config',
} as const;

export const SKIP_PARAM = 'diffs-extension-skip';
export const DIFFSHUB_ORIGIN = 'https://diffs.veraze.io';

export interface ExtensionConfig {
  enabled: boolean;
}

export const DEFAULT_CONFIG: ExtensionConfig = {
  enabled: true,
};

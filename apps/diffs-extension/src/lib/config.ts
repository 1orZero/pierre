export const STORAGE_KEYS = {
  config: 'diffs-extension.config',
  token: 'diffs-extension.githubPat',
} as const;

export const SKIP_PARAM = 'diffs-extension-skip';

export const TARGET_ORIGINS = {
  prod: 'https://diffs.veraze.io',
  local: 'http://localhost:3692',
} as const;

export type ExtensionTarget = keyof typeof TARGET_ORIGINS;

export interface ExtensionConfig {
  enabled: boolean;
  target: ExtensionTarget;
}

export const DEFAULT_CONFIG: ExtensionConfig = {
  enabled: true,
  target: 'prod',
};

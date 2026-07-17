import type { DiffIndicators } from '@pierre/diffs';

export interface DisplaySettings {
  diffIndicators: DiffIndicators;
  lineNumbers: boolean;
  overflow: 'wrap' | 'scroll';
  showBackgrounds: boolean;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  diffIndicators: 'bars',
  lineNumbers: true,
  overflow: 'scroll',
  showBackgrounds: true,
};

const DISPLAY_SETTINGS_STORAGE_KEY = 'diffshub.displaySettings';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseDisplaySettings(value: unknown): DisplaySettings {
  if (!isRecord(value)) {
    return DEFAULT_DISPLAY_SETTINGS;
  }

  const diffIndicators = value.diffIndicators;
  const overflow = value.overflow;

  return {
    diffIndicators:
      diffIndicators === 'bars' ||
      diffIndicators === 'classic' ||
      diffIndicators === 'none'
        ? diffIndicators
        : DEFAULT_DISPLAY_SETTINGS.diffIndicators,
    lineNumbers:
      typeof value.lineNumbers === 'boolean'
        ? value.lineNumbers
        : DEFAULT_DISPLAY_SETTINGS.lineNumbers,
    overflow:
      overflow === 'wrap' || overflow === 'scroll'
        ? overflow
        : DEFAULT_DISPLAY_SETTINGS.overflow,
    showBackgrounds:
      typeof value.showBackgrounds === 'boolean'
        ? value.showBackgrounds
        : DEFAULT_DISPLAY_SETTINGS.showBackgrounds,
  };
}

export function readDisplaySettings(): DisplaySettings {
  try {
    const stored = globalThis.localStorage?.getItem(
      DISPLAY_SETTINGS_STORAGE_KEY
    );
    if (stored == null) {
      return DEFAULT_DISPLAY_SETTINGS;
    }
    const parsed: unknown = JSON.parse(stored);
    return parseDisplaySettings(parsed);
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
}

export function writeDisplaySettings(settings: DisplaySettings): void {
  try {
    globalThis.localStorage?.setItem(
      DISPLAY_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

import { afterEach, describe, expect, test } from 'bun:test';

import {
  DEFAULT_DISPLAY_SETTINGS,
  readDisplaySettings,
  writeDisplaySettings,
} from '../components/displaySettings';

describe('display settings persistence', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  test('round-trips valid settings and falls back for invalid values', () => {
    let storedValue: string | null = null;
    Reflect.set(globalThis, 'localStorage', {
      getItem(): string | null {
        return storedValue;
      },
      setItem(_key: string, value: string): void {
        storedValue = value;
      },
    });

    const settings = {
      diffIndicators: 'classic',
      lineNumbers: false,
      overflow: 'wrap',
      showBackgrounds: false,
    } as const;
    writeDisplaySettings(settings);
    expect(readDisplaySettings()).toEqual(settings);

    storedValue = JSON.stringify({
      diffIndicators: 'invalid',
      lineNumbers: false,
      overflow: 'wrap',
      showBackgrounds: 'invalid',
    });
    expect(readDisplaySettings()).toEqual({
      ...DEFAULT_DISPLAY_SETTINGS,
      lineNumbers: false,
      overflow: 'wrap',
    });

    storedValue = 'invalid json';
    expect(readDisplaySettings()).toEqual(DEFAULT_DISPLAY_SETTINGS);
  });
});

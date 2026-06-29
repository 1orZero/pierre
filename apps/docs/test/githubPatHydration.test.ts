import { afterEach, describe, expect, test } from 'bun:test';

import * as githubViewer from '../app/(diffshub)/(view)/_components/githubViewer';

describe('GitHub PAT hydration', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  test('starts from a server-safe snapshot even when localStorage has a PAT', () => {
    Reflect.set(globalThis, 'window', {
      localStorage: {
        getItem(key: string): string | null {
          return key === 'diffshub.githubPat' ? 'github_pat_saved' : null;
        },
      },
    });

    expect(typeof githubViewer.getHydrationSafeGitHubPatSnapshot).toBe(
      'function'
    );
    expect(githubViewer.getHydrationSafeGitHubPatSnapshot()).toBeNull();
  });
});

import { describe, expect, test } from 'bun:test';

import {
  decodePullRequestTitle,
  encodePullRequestTitle,
} from '../lib/pullRequestTitleHeader';

describe('pull request title header', () => {
  test('round trips Unicode titles and ignores malformed values', () => {
    const title = 'Fix 中文 title ✨';

    expect(decodePullRequestTitle(encodePullRequestTitle(title))).toBe(title);
    expect(decodePullRequestTitle('%E0%A4%A')).toBeNull();
  });
});

import { describe, expect, test } from 'bun:test';

import { getGitHubTokenFromAuthorizationHeader } from '../app/api/githubAuth';

describe('getGitHubTokenFromAuthorizationHeader', () => {
  test('returns the bearer token', () => {
    expect(getGitHubTokenFromAuthorizationHeader('Bearer github_pat_123')).toBe(
      'github_pat_123'
    );
  });

  test('rejects missing or non-bearer values', () => {
    expect(getGitHubTokenFromAuthorizationHeader(null)).toBeUndefined();
    expect(getGitHubTokenFromAuthorizationHeader('')).toBeUndefined();
    expect(
      getGitHubTokenFromAuthorizationHeader('token github_pat_123')
    ).toBeUndefined();
  });
});

import { describe, expect, test } from 'bun:test';

import {
  GENERIC_PATCH_LOAD_ERROR_MESSAGE,
  getPatchLoadErrorMessage,
} from '../lib/patchLoadErrorMessage';

const TOO_LARGE_MESSAGE =
  'This diff is too large for GitHub’s API (more than 300 changed files), so it can’t be loaded here. Open it on GitHub instead.';

describe('getPatchLoadErrorMessage', () => {
  test('returns the too-large message for a bridge-style GitHub JSON error', () => {
    const bridgeErrorBody: string = JSON.stringify({
      message:
        'Sorry, the diff exceeded the maximum number of files (300). Consider using a smaller diff.',
      errors: [{ code: 'too_large' }],
      documentation_url:
        'https://docs.github.com/rest/pulls/pulls#list-pull-requests-files',
    });
    expect(getPatchLoadErrorMessage(new Error(bridgeErrorBody))).toBe(
      TOO_LARGE_MESSAGE
    );
  });

  test('returns the too-large message for the server proxy 406 error', () => {
    expect(
      getPatchLoadErrorMessage(
        new Error('Failed to fetch patch: 406 Not Acceptable')
      )
    ).toBe(TOO_LARGE_MESSAGE);
  });

  test('returns the generic message for unrelated errors', () => {
    expect(getPatchLoadErrorMessage(new Error('Network request failed'))).toBe(
      GENERIC_PATCH_LOAD_ERROR_MESSAGE
    );
  });

  test('returns the generic message for non-Error values', () => {
    expect(getPatchLoadErrorMessage('too_large')).toBe(
      GENERIC_PATCH_LOAD_ERROR_MESSAGE
    );
    expect(getPatchLoadErrorMessage(undefined)).toBe(
      GENERIC_PATCH_LOAD_ERROR_MESSAGE
    );
  });

  test('does not match status codes that merely start with 406', () => {
    expect(
      getPatchLoadErrorMessage(new Error('Failed to fetch patch: 4067'))
    ).toBe(GENERIC_PATCH_LOAD_ERROR_MESSAGE);
    expect(
      getPatchLoadErrorMessage(new Error('Failed to fetch patch: 4060 status'))
    ).toBe(GENERIC_PATCH_LOAD_ERROR_MESSAGE);
  });
});

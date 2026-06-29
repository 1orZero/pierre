import { describe, expect, test } from 'bun:test';

import { getDiffshubPath, getDiffshubUrl } from '../src/lib/url';

describe('getDiffshubPath', () => {
  test('normalizes pull request URLs', () => {
    expect(getDiffshubPath('https://github.com/owner/repo/pull/123')).toBe(
      '/owner/repo/pull/123'
    );
    expect(
      getDiffshubPath('https://github.com/owner/repo/pull/123/files?plain=1')
    ).toBe('/owner/repo/pull/123');
    expect(
      getDiffshubPath('https://github.com/owner/repo/pull/123.diff#files')
    ).toBe('/owner/repo/pull/123');
  });

  test('normalizes PR commit-scoped URLs to commit URLs', () => {
    expect(
      getDiffshubPath('https://github.com/owner/repo/pull/123/files/abc123def')
    ).toBe('/owner/repo/commit/abc123def');
  });

  test('normalizes commit and compare URLs', () => {
    expect(
      getDiffshubPath('https://github.com/owner/repo/commit/abc1234')
    ).toBe('/owner/repo/commit/abc1234');
    expect(
      getDiffshubPath(
        'https://github.com/torvalds/linux/compare/v6.0...v7.0.diff'
      )
    ).toBe('/torvalds/linux/compare/v6.0...v7.0');
  });

  test('normalizes raw GitHub diff URLs', () => {
    expect(
      getDiffshubPath(
        'https://patch-diff.githubusercontent.com/raw/owner/repo/pull/123.patch'
      )
    ).toBe('/owner/repo/pull/123');
  });

  test('rejects unsupported URLs', () => {
    expect(
      getDiffshubPath('https://github.com/owner/repo/issues/1')
    ).toBeNull();
    expect(
      getDiffshubPath('https://github.com/owner/repo/commit/abc123')
    ).toBeNull();
    expect(getDiffshubPath('https://example.com/owner/repo/pull/1')).toBeNull();
  });
});

describe('getDiffshubUrl', () => {
  test('builds a target URL for supported GitHub URLs', () => {
    expect(
      getDiffshubUrl('https://github.com/owner/repo/pull/123/files', {
        targetOrigin: 'https://diffshub.com',
      })
    ).toBe('https://diffshub.com/owner/repo/pull/123');
  });
});

import { describe, expect, test } from 'bun:test';

import { buildDynamicRules, RULE_IDS } from '../src/lib/rules';

describe('buildDynamicRules', () => {
  test('returns no redirect rules when disabled', () => {
    expect(buildDynamicRules({ enabled: false, target: 'prod' })).toEqual([]);
  });

  test('builds redirect rules for enabled prod config', () => {
    const rules = buildDynamicRules({ enabled: true, target: 'prod' });

    expect(rules.map((rule) => rule.id)).toEqual(RULE_IDS);
    expect(
      rules.some((rule) =>
        JSON.stringify(rule.action).includes('https://diffs.veraze.io')
      )
    ).toBe(true);
  });

  test('builds redirect rules for local dev config', () => {
    const rules = buildDynamicRules({ enabled: true, target: 'local' });

    expect(
      rules.some((rule) =>
        JSON.stringify(rule.action).includes('http://localhost:3692')
      )
    ).toBe(true);
  });

  test('keeps Chrome regex filters below common memory-limit pitfalls', () => {
    const rules = buildDynamicRules({ enabled: true, target: 'prod' });
    const filters = rules
      .map((rule) => rule.condition.regexFilter)
      .filter((filter): filter is string => typeof filter === 'string');

    expect(filters.length).toBeGreaterThan(0);
    expect(filters.every((filter) => !/[{][0-9,]+[}]/.test(filter))).toBe(true);
  });

  test('does not match commit-like paths shorter than a GitHub short SHA', () => {
    const rules = buildDynamicRules({ enabled: true, target: 'prod' });
    const filters = rules
      .map((rule) => rule.condition.regexFilter)
      .filter((filter): filter is string => typeof filter === 'string');

    expect(
      filters.some((filter) =>
        new RegExp(filter).test('https://github.com/owner/repo/commit/abc123')
      )
    ).toBe(false);
  });

  test('matches full GitHub SHA commit-like paths', () => {
    const rules = buildDynamicRules({ enabled: true, target: 'prod' });
    const filters = rules
      .map((rule) => rule.condition.regexFilter)
      .filter((filter): filter is string => typeof filter === 'string');

    expect(
      filters.some((filter) =>
        new RegExp(filter).test(
          `https://github.com/owner/repo/commit/${'a'.repeat(40)}`
        )
      )
    ).toBe(true);
  });

  test('does not match commit-like paths longer than a GitHub full SHA', () => {
    const rules = buildDynamicRules({ enabled: true, target: 'prod' });
    const filters = rules
      .map((rule) => rule.condition.regexFilter)
      .filter((filter): filter is string => typeof filter === 'string');

    expect(
      filters.some((filter) =>
        new RegExp(filter).test(
          `https://github.com/owner/repo/commit/${'a'.repeat(41)}`
        )
      )
    ).toBe(false);
  });
});

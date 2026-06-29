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
});

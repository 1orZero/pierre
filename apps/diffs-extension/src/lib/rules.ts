import { type ExtensionConfig, SKIP_PARAM } from './config';
import { getTargetOrigin } from './url';

const RULE_ALLOW_SKIP = 1;
const RULE_PR_COMMIT_REDIRECT = 2;
const RULE_PULL_REDIRECT = 3;
const RULE_COMMIT_REDIRECT = 4;
const RULE_COMPARE_WITH_SUFFIX_REDIRECT = 5;
const RULE_COMPARE_REDIRECT = 6;
const HEX = '[0-9a-fA-F]';
const SHA_FULL = HEX.repeat(40);

export const RULE_IDS = [
  RULE_ALLOW_SKIP,
  RULE_PR_COMMIT_REDIRECT,
  RULE_PULL_REDIRECT,
  RULE_COMMIT_REDIRECT,
  RULE_COMPARE_WITH_SUFFIX_REDIRECT,
  RULE_COMPARE_REDIRECT,
];

export function buildDynamicRules(
  config: ExtensionConfig
): chrome.declarativeNetRequest.Rule[] {
  if (!config.enabled) return [];

  const origin = getTargetOrigin(config.target);
  return [
    {
      id: RULE_ALLOW_SKIP,
      priority: 10,
      action: { type: 'allow' },
      condition: {
        regexFilter: `^https://github\\.com/.*[?&]${SKIP_PARAM}=1(?:[&#].*)?$`,
        resourceTypes: ['main_frame'],
      },
    },
    {
      id: RULE_PR_COMMIT_REDIRECT,
      priority: 4,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: `${origin}/\\1/commit/\\2`,
        },
      },
      condition: {
        regexFilter: `^https://github\\.com/([^/]+/[^/]+)/pull/\\d+/(?:files|changes|commits)/(${SHA_FULL})(?:[?#].*)?$`,
        resourceTypes: ['main_frame'],
      },
    },
    {
      id: RULE_PULL_REDIRECT,
      priority: 3,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: `${origin}/\\1/pull/\\2`,
        },
      },
      condition: {
        regexFilter:
          '^https://github\\.com/([^/]+/[^/]+)/pull/(\\d+)(?:\\.(?:diff|patch))?(?:/(?:files|changes|commits))?(?:[?#].*)?$',
        resourceTypes: ['main_frame'],
      },
    },
    {
      id: RULE_COMMIT_REDIRECT,
      priority: 3,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: `${origin}/\\1/commit/\\2`,
        },
      },
      condition: {
        regexFilter: `^https://github\\.com/([^/]+/[^/]+)/commit/(${SHA_FULL})(?:\\.(?:diff|patch))?(?:[?#].*)?$`,
        resourceTypes: ['main_frame'],
      },
    },
    {
      id: RULE_COMPARE_WITH_SUFFIX_REDIRECT,
      priority: 3,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: `${origin}/\\1/compare/\\2`,
        },
      },
      condition: {
        regexFilter:
          '^https://github\\.com/([^/]+/[^/]+)/compare/([^/?#]+?)\\.(?:diff|patch)(?:[?#].*)?$',
        resourceTypes: ['main_frame'],
      },
    },
    {
      id: RULE_COMPARE_REDIRECT,
      priority: 2,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: `${origin}/\\1/compare/\\2`,
        },
      },
      condition: {
        regexFilter:
          '^https://github\\.com/([^/]+/[^/]+)/compare/([^/?#]+)(?:[?#].*)?$',
        resourceTypes: ['main_frame'],
      },
    },
  ];
}

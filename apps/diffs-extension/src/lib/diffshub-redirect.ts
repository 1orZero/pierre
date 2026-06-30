import { type ExtensionConfig } from './config';
import {
  getDiffshubUrlFromDiffshub,
  getGitHubUrlFromDiffshub,
  getTargetOrigin,
} from './url';

export interface DiffshubRedirectDecision {
  config: ExtensionConfig;
  href: string;
}

export function decideDiffshubRedirect(
  decision: DiffshubRedirectDecision
): string | null {
  let currentUrl: URL;
  try {
    currentUrl = new URL(decision.href);
  } catch {
    return null;
  }

  if (!decision.config.enabled) {
    return getGitHubUrlFromDiffshub(decision.href, { skipExtension: true });
  }

  const targetOrigin = getTargetOrigin(decision.config.target);
  if (currentUrl.origin === targetOrigin) return null;

  return getDiffshubUrlFromDiffshub(decision.href, { targetOrigin });
}

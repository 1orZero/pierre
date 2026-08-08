import { type ExtensionConfig } from './config';
import { getGitHubUrlFromDiffshub } from './url';

export interface DiffshubRedirectDecision {
  config: ExtensionConfig;
  href: string;
}

export function decideDiffshubRedirect(
  decision: DiffshubRedirectDecision
): string | null {
  if (!decision.config.enabled) {
    return getGitHubUrlFromDiffshub(decision.href, { skipExtension: true });
  }

  return null;
}

import { type ExtensionConfig } from './config';
import { getDiffshubUrl, getTargetOrigin } from './url';

export interface GitHubRedirectDecision {
  config: ExtensionConfig;
  escapeActive: boolean;
  href: string;
  viaHistory: boolean;
}

export function decideGitHubRedirect(
  decision: GitHubRedirectDecision
): string | null {
  if (!decision.config.enabled) return null;
  if (decision.escapeActive) return null;
  if (decision.viaHistory) return null;

  return getDiffshubUrl(decision.href, {
    targetOrigin: getTargetOrigin(decision.config.target),
  });
}

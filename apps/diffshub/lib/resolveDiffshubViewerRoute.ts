import { normalizeGitHubPath } from './normalizeGitHubPath';

export type DiffshubViewerRoute =
  | { kind: 'redirect'; target: string }
  | { kind: 'render'; upstreamPath: string; url: string };

export function resolveDiffshubViewerRoute(
  pathSegments: readonly string[]
): DiffshubViewerRoute {
  if (pathSegments.length === 0) {
    return { kind: 'redirect', target: '/' };
  }

  const joinedPath = `/${pathSegments.join('/')}`;
  const upstreamPath = normalizeGitHubPath(joinedPath);
  if (upstreamPath !== joinedPath) {
    return { kind: 'redirect', target: upstreamPath };
  }

  return {
    kind: 'render',
    upstreamPath,
    url: `https://github.com${upstreamPath}`,
  };
}

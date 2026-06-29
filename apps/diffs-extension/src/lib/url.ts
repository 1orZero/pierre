import { type ExtensionTarget, TARGET_ORIGINS } from './config';

const GITHUB_HOST = 'github.com';
const GITHUB_RAW_DIFF_HOST = 'patch-diff.githubusercontent.com';
const RAW_PULL_PATTERN =
  /^\/raw\/([^/]+)\/([^/]+)\/pull\/(\d+)\.(?:diff|patch)$/;
const PULL_COMMIT_PATTERN =
  /^\/([^/]+)\/([^/]+)\/pull\/\d+\/(?:files|changes|commits)\/([0-9a-f]{7,40})(?:\.(?:diff|patch))?$/i;
const PULL_PATTERN =
  /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\.(?:diff|patch))?(?:\/(?:files|changes|commits))?$/;
const COMMIT_PATTERN =
  /^\/([^/]+)\/([^/]+)\/commit\/([0-9a-f]{7,40})(?:\.(?:diff|patch))?$/i;
const COMPARE_PATTERN =
  /^\/([^/]+)\/([^/]+)\/compare\/(.+?)(?:\.(?:diff|patch))?$/;

export function getTargetOrigin(target: ExtensionTarget): string {
  return TARGET_ORIGINS[target];
}

export function getDiffshubPath(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (url.hostname === GITHUB_RAW_DIFF_HOST) {
    const rawMatch = RAW_PULL_PATTERN.exec(url.pathname.replace(/\/+$/, ''));
    if (rawMatch == null) return null;
    return `/${rawMatch[1]}/${rawMatch[2]}/pull/${rawMatch[3]}`;
  }

  if (url.hostname !== GITHUB_HOST) {
    return null;
  }

  return normalizeGitHubPath(url.pathname);
}

export function getDiffshubUrl(
  input: string,
  options: { targetOrigin: string }
): string | null {
  const path = getDiffshubPath(input);
  return path == null ? null : `${options.targetOrigin}${path}`;
}

export function normalizeGitHubPath(path: string): string | null {
  const normalizedPath = path.replace(/\/+$/, '');

  const pullCommitMatch = PULL_COMMIT_PATTERN.exec(normalizedPath);
  if (pullCommitMatch != null) {
    return `/${pullCommitMatch[1]}/${pullCommitMatch[2]}/commit/${pullCommitMatch[3]}`;
  }

  const pullMatch = PULL_PATTERN.exec(normalizedPath);
  if (pullMatch != null) {
    return `/${pullMatch[1]}/${pullMatch[2]}/pull/${pullMatch[3]}`;
  }

  const commitMatch = COMMIT_PATTERN.exec(normalizedPath);
  if (commitMatch != null) {
    return `/${commitMatch[1]}/${commitMatch[2]}/commit/${commitMatch[3]}`;
  }

  const compareMatch = COMPARE_PATTERN.exec(normalizedPath);
  if (compareMatch != null) {
    return `/${compareMatch[1]}/${compareMatch[2]}/compare/${compareMatch[3]}`;
  }

  return null;
}

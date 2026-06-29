import { normalizeGitHubPath } from './url';

const GITHUB_API_ORIGIN = 'https://api.github.com';
const GITHUB_DIFF_ACCEPT = 'application/vnd.github.v3.diff';
const GITHUB_HOST = 'github.com';
const PULL_PATTERN = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)$/;
const COMMIT_PATTERN = /^\/([^/]+)\/([^/]+)\/commit\/([0-9a-f]{7,40})$/i;
const COMPARE_PATTERN = /^\/([^/]+)\/([^/]+)\/compare\/(.+)$/;

export interface FetchGitHubDiffOptions {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  sourceUrl: string;
  token: string;
}

export interface FetchGitHubDiffResult {
  body: string;
  ok: boolean;
  status: number;
}

function getGitHubApiUrl(sourceUrl: string): string | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return null;
  }

  if (parsedUrl.hostname !== GITHUB_HOST) {
    return null;
  }

  const path = normalizeGitHubPath(parsedUrl.pathname);
  if (path == null) return null;

  const pullMatch = PULL_PATTERN.exec(path);
  if (pullMatch != null) {
    return `${GITHUB_API_ORIGIN}/repos/${pullMatch[1]}/${pullMatch[2]}/pulls/${pullMatch[3]}`;
  }

  const commitMatch = COMMIT_PATTERN.exec(path);
  if (commitMatch != null) {
    return `${GITHUB_API_ORIGIN}/repos/${commitMatch[1]}/${commitMatch[2]}/commits/${commitMatch[3]}`;
  }

  const compareMatch = COMPARE_PATTERN.exec(path);
  if (compareMatch != null) {
    return `${GITHUB_API_ORIGIN}/repos/${compareMatch[1]}/${compareMatch[2]}/compare/${compareMatch[3]}`;
  }

  return null;
}

export async function fetchGitHubDiff(
  options: FetchGitHubDiffOptions
): Promise<FetchGitHubDiffResult> {
  const token = options.token.trim();
  if (token === '') {
    return {
      body: 'Add a GitHub PAT in Diffs Extension to view this private diff.',
      ok: false,
      status: 401,
    };
  }

  const apiUrl = getGitHubApiUrl(options.sourceUrl);
  if (apiUrl == null) {
    return {
      body: 'Unsupported GitHub diff URL.',
      ok: false,
      status: 400,
    };
  }

  let response: Response;
  try {
    response = await options.fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        Accept: GITHUB_DIFF_ACCEPT,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return {
      body: 'Failed to fetch GitHub diff.',
      ok: false,
      status: 502,
    };
  }

  try {
    return {
      body: await response.text(),
      ok: response.ok,
      status: response.status,
    };
  } catch {
    return {
      body: 'Failed to read GitHub diff.',
      ok: false,
      status: 502,
    };
  }
}

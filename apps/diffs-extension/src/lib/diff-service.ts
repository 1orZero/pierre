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

interface GitHubDiffUrls {
  apiUrl: string;
  webDiffUrl: string;
}

function getGitHubDiffUrls(sourceUrl: string): GitHubDiffUrls | null {
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

  let apiUrl: string | null = null;

  const pullMatch = PULL_PATTERN.exec(path);
  if (pullMatch != null) {
    apiUrl = `${GITHUB_API_ORIGIN}/repos/${pullMatch[1]}/${pullMatch[2]}/pulls/${pullMatch[3]}`;
  }

  const commitMatch = COMMIT_PATTERN.exec(path);
  if (commitMatch != null) {
    apiUrl = `${GITHUB_API_ORIGIN}/repos/${commitMatch[1]}/${commitMatch[2]}/commits/${commitMatch[3]}`;
  }

  const compareMatch = COMPARE_PATTERN.exec(path);
  if (compareMatch != null) {
    apiUrl = `${GITHUB_API_ORIGIN}/repos/${compareMatch[1]}/${compareMatch[2]}/compare/${compareMatch[3]}`;
  }

  if (apiUrl == null) return null;

  // Both URLs derive from the same normalized path so the web fallback can
  // never fetch an attacker-controlled URL with the user's session cookies.
  return {
    apiUrl,
    webDiffUrl: `https://${GITHUB_HOST}${path}.diff`,
  };
}

// The GitHub diff API caps diffs at 300 changed files and returns 406 for
// larger diffs. The plain web endpoint (github.com/{path}.diff) has no such
// cap but requires the user's logged-in browser session cookies.
async function fetchWebDiffFallback(
  fetchFn: FetchGitHubDiffOptions['fetch'],
  webDiffUrl: string
): Promise<FetchGitHubDiffResult | null> {
  try {
    const response = await fetchFn(webDiffUrl, {
      cache: 'no-store',
      credentials: 'include',
      redirect: 'follow',
    });
    if (!response.ok) return null;
    const body = await response.text();
    // A non-diff body (e.g. an HTML login page) is a failure.
    if (!body.startsWith('diff --git')) return null;
    return { body, ok: true, status: 200 };
  } catch {
    return null;
  }
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

  const urls = getGitHubDiffUrls(options.sourceUrl);
  if (urls == null) {
    return {
      body: 'Unsupported GitHub diff URL.',
      ok: false,
      status: 400,
    };
  }

  let response: Response;
  try {
    response = await options.fetch(urls.apiUrl, {
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

  let result: FetchGitHubDiffResult;
  try {
    result = {
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

  // 406 means the API refused the diff (over 300 changed files); try the
  // uncapped web endpoint, keeping the original API result on any failure.
  if (result.status === 406) {
    const fallback = await fetchWebDiffFallback(options.fetch, urls.webDiffUrl);
    if (fallback != null) return fallback;
  }

  return result;
}

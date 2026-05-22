import { type NextRequest } from 'next/server';

const GITHUB_API_HOST = 'api.github.com';
const GITHUB_API_VERSION = '2022-11-28';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PER_PAGE = 50;

type PullState = 'open' | 'closed';

const ALLOWED_STATES: ReadonlySet<string> = new Set(['open', 'closed']);
const ALLOWED_ROLES: ReadonlySet<string> = new Set([
  'author',
  'review-requested',
  'assignee',
  'involves',
]);

interface PullSummary {
  id: number;
  number: number;
  title: string;
  htmlUrl: string;
  // Path the viewer renders for this PR, e.g. /octocat/hello-world/pull/42.
  viewerPath: string;
  repo: string; // owner/repo
  state: PullState;
  draft: boolean;
  authorLogin: string;
  authorAvatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

// Proxies GitHub's /search/issues for PRs scoped to the authenticated viewer.
// Two independent filters compose into the search query:
//   - `repo` (owner/name): when set, adds `repo:<repo>` so results stay in
//     that one repository.
//   - `role` (author|review-requested|assignee): when set, adds
//     `<role>:<login>` so results are scoped to the viewer's PR involvement.
// If neither is provided, the query falls back to `involves:<login>` so we
// never issue an unscoped GitHub search.
export async function GET(request: NextRequest): Promise<Response> {
  if (GITHUB_TOKEN == null || GITHUB_TOKEN === '') {
    return jsonError(
      'GITHUB_TOKEN is not set. Add it to apps/docs/.env.local to list PRs.',
      503
    );
  }

  const params = request.nextUrl.searchParams;
  const state = (params.get('state') ?? 'open') as PullState;
  const repoParam = params.get('repo');
  const roleParam = params.get('role');
  const login = params.get('login');

  if (!ALLOWED_STATES.has(state)) {
    return jsonError('Invalid state.', 400);
  }
  if (login == null || login === '') {
    return jsonError('login is required.', 400);
  }

  const queryTokens: string[] = ['is:pr', `is:${state}`];
  if (repoParam != null && repoParam !== '') {
    if (!/^[^/\s]+\/[^/\s]+$/.test(repoParam)) {
      return jsonError('Invalid repo.', 400);
    }
    queryTokens.push(`repo:${repoParam}`);
  }
  if (roleParam != null && roleParam !== '') {
    if (!ALLOWED_ROLES.has(roleParam)) {
      return jsonError('Invalid role.', 400);
    }
    queryTokens.push(`${roleParam}:${login}`);
  } else if (repoParam == null || repoParam === '') {
    // Without a repo or role, fall back to "PRs involving me" so GitHub
    // search always has a sensible scope.
    queryTokens.push(`involves:${login}`);
  }
  const searchQuery = queryTokens.join(' ');
  const url = new URL(`https://${GITHUB_API_HOST}/search/issues`);
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('sort', 'updated');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(PER_PAGE));

  let response: Response;
  try {
    response = await fetch(url.href, {
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'pierre-diffshub',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
      signal: request.signal,
    });
  } catch {
    return jsonError('Failed to reach GitHub.', 502);
  }

  if (!response.ok) {
    let message: string | undefined;
    try {
      const json = (await response.json()) as { message?: unknown };
      if (typeof json.message === 'string') {
        message = `GitHub: ${json.message}`;
      }
    } catch {
      // Fall through.
    }
    return jsonError(
      message ?? `GitHub returned ${response.status}.`,
      response.status >= 400 && response.status < 600 ? response.status : 502
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return jsonError('GitHub returned unparseable JSON.', 502);
  }

  if (
    typeof json !== 'object' ||
    json === null ||
    !('items' in json) ||
    !Array.isArray((json as { items: unknown }).items)
  ) {
    return jsonError('Unexpected GitHub response shape.', 502);
  }

  const items = (json as { items: unknown[] }).items;
  const pulls: PullSummary[] = [];
  for (const raw of items) {
    const parsed = parsePullSummary(raw);
    if (parsed != null) {
      pulls.push(parsed);
    }
  }
  return Response.json({ pulls });
}

function parsePullSummary(raw: unknown): PullSummary | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const data = raw as Record<string, unknown>;
  const id = data.id;
  const number = data.number;
  const title = data.title;
  const htmlUrl = data.html_url;
  const repositoryUrl = data.repository_url;
  const state = data.state;
  const draft = data.draft;
  const createdAt = data.created_at;
  const updatedAt = data.updated_at;
  const user = data.user;

  if (
    typeof id !== 'number' ||
    typeof number !== 'number' ||
    typeof title !== 'string' ||
    typeof htmlUrl !== 'string' ||
    typeof repositoryUrl !== 'string' ||
    (state !== 'open' && state !== 'closed') ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string'
  ) {
    return undefined;
  }
  if (typeof user !== 'object' || user === null) {
    return undefined;
  }
  const userData = user as Record<string, unknown>;
  const authorLogin = userData.login;
  const authorAvatarUrl = userData.avatar_url;
  if (typeof authorLogin !== 'string' || typeof authorAvatarUrl !== 'string') {
    return undefined;
  }

  // repository_url is shaped like https://api.github.com/repos/{owner}/{repo};
  // take the last two segments as the repo slug used for the viewer path.
  const repoPath = repositoryUrl.replace(/^.*\/repos\//, '');
  if (repoPath === repositoryUrl || repoPath.split('/').length !== 2) {
    return undefined;
  }

  return {
    id,
    number,
    title,
    htmlUrl,
    viewerPath: `/${repoPath}/pull/${number}`,
    repo: repoPath,
    state,
    draft: typeof draft === 'boolean' ? draft : false,
    authorLogin,
    authorAvatarUrl,
    createdAt,
    updatedAt,
  };
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

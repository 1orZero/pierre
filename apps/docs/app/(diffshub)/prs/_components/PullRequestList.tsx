'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { GitHubPatButton } from '../../(view)/_components/GitHubPatButton';
import {
  githubFetch,
  useGitHubPat,
  useGitHubViewer,
} from '../../(view)/_components/githubViewer';
import { cn } from '@/lib/utils';

type PullState = 'open' | 'closed';
// `'all'` is encoded as the absence of the role param when calling /api/pulls,
// so the server skips the role token in the GitHub query and (if no repo is
// selected) falls back to involves:login.
type PullRole = 'all' | 'review-requested' | 'author' | 'assignee';

// `repoFilter === null` means no repo filter (the role tab is the only scope).
// A non-null value is an "owner/name" string passed straight to /api/pulls.
type RepoFilter = string | null;

interface PullSummary {
  id: number;
  number: number;
  title: string;
  htmlUrl: string;
  viewerPath: string;
  repo: string;
  state: PullState;
  draft: boolean;
  authorLogin: string;
  authorAvatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface RepoSummary {
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
}

const ROLE_TABS: ReadonlyArray<{ value: PullRole; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'review-requested', label: 'Reviewing' },
  { value: 'author', label: 'Authored' },
  { value: 'assignee', label: 'Assigned' },
];

// Module-level stale-while-revalidate caches. Survive component remounts and
// route navigations within the session so the user never sees a Loading flash
// on a filter combo they've already loaded. Background refetches still fire
// every time, so the data is refreshed within ~one round-trip.
const pullsCache = new Map<string, PullSummary[]>();
let cachedRepos: RepoSummary[] | undefined;

function getPullsCacheKey(
  state: PullState,
  role: PullRole,
  repoFilter: RepoFilter
): string {
  return `${state}|${role}|${repoFilter ?? ''}`;
}

export function PullRequestList() {
  const viewer = useGitHubViewer();
  const token = useGitHubPat();
  const [role, setRole] = useState<PullRole>('review-requested');
  const [state, setState] = useState<PullState>('open');
  const [repoFilter, setRepoFilter] = useState<RepoFilter>(null);
  const [repos, setRepos] = useState<RepoSummary[]>(() => cachedRepos ?? []);
  const [pulls, setPulls] = useState<PullSummary[]>([]);
  const [loadState, setLoadState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    cachedRepos = undefined;
    pullsCache.clear();
    setRepos([]);
    setPulls([]);
    setLoadState('idle');
    setErrorMessage(null);
  }, [token]);

  // Load the repo list once on mount so the dropdown is populated. Failures
  // are non-fatal; the user can still browse "My PRs" without a repo list.
  useEffect(() => {
    if (viewer == null) {
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await githubFetch('/api/repos', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const json = (await response.json()) as { repos?: RepoSummary[] };
        if (controller.signal.aborted) return;
        if (Array.isArray(json.repos)) {
          cachedRepos = json.repos;
          setRepos(json.repos);
        }
      } catch {
        // Silent — dropdown just stays at "My PRs" only.
      }
    })();
    return () => {
      controller.abort();
    };
  }, [viewer]);

  useEffect(() => {
    if (viewer == null) {
      return;
    }
    const cacheKey = getPullsCacheKey(state, role, repoFilter);
    const cached = pullsCache.get(cacheKey);
    if (cached != null) {
      // Paint the stale result instantly so tab/dropdown changes never flash
      // "Loading…". The fetch below still runs and will replace this once it
      // resolves.
      setPulls(cached);
      setLoadState('ready');
      setErrorMessage(null);
    } else {
      setLoadState('loading');
      setErrorMessage(null);
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ state, login: viewer.login });
    if (role !== 'all') {
      params.set('role', role);
    }
    if (repoFilter != null) {
      params.set('repo', repoFilter);
    }
    void (async () => {
      try {
        const response = await githubFetch(`/api/pulls?${params}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          const text = (await response.json().catch(() => ({}))) as {
            error?: unknown;
          };
          const message =
            typeof text.error === 'string'
              ? text.error
              : `HTTP ${response.status}`;
          throw new Error(message);
        }
        const json = (await response.json()) as { pulls?: PullSummary[] };
        if (controller.signal.aborted) return;
        const freshPulls = Array.isArray(json.pulls) ? json.pulls : [];
        pullsCache.set(cacheKey, freshPulls);
        setPulls(freshPulls);
        setLoadState('ready');
      } catch (error) {
        if (controller.signal.aborted) return;
        // Keep the cached results on screen if we have any; surface the error
        // only when there is no cached fallback to show.
        const message =
          error instanceof Error ? error.message : 'Failed to load PRs.';
        if (cached == null) {
          setErrorMessage(message);
          setLoadState('error');
        }
      }
    })();
    return () => {
      controller.abort();
    };
  }, [viewer, role, state, repoFilter]);

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Pull requests</h1>
        <div className="flex items-center gap-2 text-sm">
          {viewer != null && (
            <>
              <select
                value={repoFilter ?? ''}
                onChange={(event) => {
                  const next = event.currentTarget.value;
                  setRepoFilter(next === '' ? null : next);
                }}
                className="bg-background hover:bg-muted rounded-md border border-[rgb(0_0_0_/_0.1)] px-2 py-1 outline-none dark:border-[rgb(255_255_255_/_0.15)]"
              >
                <option value="">My PRs</option>
                {repos.length > 0 && (
                  <optgroup label="Repos">
                    {repos.map((repo) => (
                      <option key={repo.fullName} value={repo.fullName}>
                        {repo.fullName}
                        {repo.private ? ' (private)' : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button
                type="button"
                className={cn(
                  'rounded-md px-2 py-1',
                  state === 'open'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setState('open')}
              >
                Open
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-md px-2 py-1',
                  state === 'closed'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setState('closed')}
              >
                Closed
              </button>
            </>
          )}
          <GitHubPatButton />
        </div>
      </header>

      {viewer != null && (
        <nav className="flex gap-1 border-b border-[rgb(0_0_0_/_0.1)] dark:border-[rgb(255_255_255_/_0.15)]">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm',
                role === tab.value
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setRole(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {viewer === undefined ? (
          <div className="text-muted-foreground p-4 text-sm">Loading…</div>
        ) : viewer === null ? (
          <div className="text-muted-foreground p-4 text-sm">
            {token == null
              ? 'Add a GitHub PAT to list PRs.'
              : 'Saved GitHub PAT could not be verified.'}
          </div>
        ) : loadState === 'loading' ? (
          <div className="text-muted-foreground p-4 text-sm">Loading…</div>
        ) : loadState === 'error' ? (
          <div className="text-destructive p-4 text-sm">{errorMessage}</div>
        ) : pulls.length === 0 ? (
          <div className="text-muted-foreground p-4 text-sm">No PRs.</div>
        ) : (
          <ul className="flex flex-col gap-1">
            {pulls.map((pull) => (
              <li key={pull.id}>
                <Link
                  href={pull.viewerPath}
                  className="hover:bg-muted flex items-start gap-3 rounded-md p-3 transition-colors"
                >
                  <img
                    src={pull.authorAvatarUrl}
                    alt={pull.authorLogin}
                    className="mt-0.5 size-5 shrink-0 rounded-full object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{pull.title}</span>
                      {pull.draft && (
                        <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-neutral-700 uppercase dark:bg-neutral-700 dark:text-neutral-300">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {pull.repo} #{pull.number} · by {pull.authorLogin} ·
                      updated {formatRelativeTime(pull.updatedAt)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Lightweight relative-time formatter — avoids a date-fns dep for the one
// place we need it. Falls back to the absolute ISO date past ~30 days.
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return iso;
  }
  const diffMs = Date.now() - then;
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString();
}

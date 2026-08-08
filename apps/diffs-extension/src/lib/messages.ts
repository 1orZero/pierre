export const BRIDGE_TAG = 'diffs-extension-v2';

export interface FetchDiffRequest {
  id: string;
  sourceUrl: string;
  tag: typeof BRIDGE_TAG;
  type: 'fetchDiff';
}

export interface FetchDiffResponse {
  body: string;
  id: string;
  status: number;
  tag: typeof BRIDGE_TAG;
  type: 'fetchDiffResult';
}

export interface FetchDiffStarted {
  id: string;
  tag: typeof BRIDGE_TAG;
  type: 'fetchDiffStarted';
}

export type PageToContentMessage = FetchDiffRequest;
export type ContentToPageMessage = FetchDiffResponse | FetchDiffStarted;

export function isFetchDiffRequest(value: unknown): value is FetchDiffRequest {
  if (value == null || typeof value !== 'object') return false;
  const message = value as Partial<FetchDiffRequest>;
  return (
    message.tag === BRIDGE_TAG &&
    message.type === 'fetchDiff' &&
    typeof message.id === 'string' &&
    typeof message.sourceUrl === 'string'
  );
}

export function isFetchDiffResponse(
  value: unknown
): value is FetchDiffResponse {
  if (value == null || typeof value !== 'object') return false;
  const message = value as Partial<FetchDiffResponse>;
  return (
    message.tag === BRIDGE_TAG &&
    message.type === 'fetchDiffResult' &&
    typeof message.id === 'string' &&
    typeof message.body === 'string' &&
    typeof message.status === 'number'
  );
}

export function isFetchDiffStarted(value: unknown): value is FetchDiffStarted {
  if (value == null || typeof value !== 'object') return false;
  const message = value as Partial<FetchDiffStarted>;
  return (
    message.tag === BRIDGE_TAG &&
    message.type === 'fetchDiffStarted' &&
    typeof message.id === 'string'
  );
}

import { redirect } from 'next/navigation';

import { ReviewUI } from '@/components/ReviewUI';
import { resolveDiffshubViewerRoute } from '@/lib/resolveDiffshubViewerRoute';

// Viewer route that mirrors the upstream GitHub path.
export async function DiffsHubViewByPathPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const route = resolveDiffshubViewerRoute(path);

  if (route.kind === 'redirect') {
    redirect(route.target);
  }

  return (
    <div className="flex h-dvh flex-col gap-2">
      <ReviewUI initialUrl={route.url} path={route.upstreamPath} />
    </div>
  );
}

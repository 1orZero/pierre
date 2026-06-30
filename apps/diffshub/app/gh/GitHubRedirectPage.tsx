import { permanentRedirect } from 'next/navigation';

export function GitHubRedirectPage() {
  permanentRedirect('https://diffs.veraze.io');
}

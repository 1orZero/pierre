import { permanentRedirect } from 'next/navigation';

export default function GitHubRedirectPage() {
  permanentRedirect('https://diffs.veraze.io');
}

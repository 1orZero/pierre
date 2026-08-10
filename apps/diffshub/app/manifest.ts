import type { MetadataRoute } from 'next';

import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

// icon.png satisfies Chrome's ≥192px install and ≥512px splash-screen
// requirements.
const APP_ICON_SIZE = '512x512';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}, from Pierre`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    id: '/',
    start_url: '/',
    // diffshub is a full standalone app (viewport-fit cover).
    display: 'standalone',
    orientation: 'any',
    lang: 'en',
    dir: 'ltr',
    background_color: '#ffffff',
    // diffshub body uses --diffshub-sidebar-bg (#f7f7f7) rather than plain
    // white. The manifest only accepts a single theme_color, so we use the
    // light value; dark-mode tinting is handled via themeColor in the viewport.
    theme_color: '#f7f7f7',
    categories: ['developer', 'productivity'],
    icons: [
      {
        src: '/diffshub-brand/icon.png',
        type: 'image/png',
        sizes: APP_ICON_SIZE,
        purpose: 'any',
      },
    ],
  };
}

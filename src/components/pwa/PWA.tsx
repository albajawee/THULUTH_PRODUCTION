'use client';

import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar';
import { InstallPrompt } from './InstallPrompt';

/**
 * Single mount point for all PWA client behavior, dropped into the root layout
 * next to the Toaster. Renders no layout of its own beyond the install banner,
 * so it can't disrupt existing pages.
 */
export function PWA() {
  return (
    <>
      <ServiceWorkerRegistrar />
      <InstallPrompt />
    </>
  );
}

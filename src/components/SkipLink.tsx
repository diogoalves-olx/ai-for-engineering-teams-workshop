/**
 * SkipLink.tsx
 *
 * Accessibility skip-navigation link that allows keyboard users to bypass the
 * repeated navigation/header content and jump directly to the main page body.
 *
 * The link is visually hidden by default (`sr-only`) but becomes visible and
 * positioned in the top-left corner when it receives keyboard focus. This
 * satisfies WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks).
 *
 * No interactivity required — this is a plain anchor element and does not need
 * a 'use client' directive.
 */

import type { FC } from 'react';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SkipLink
 *
 * Renders a visually hidden anchor that becomes visible on focus and links to
 * `#main-content`. Place this as the very first element inside <body> so it
 * is the first focusable target in the tab order.
 *
 * The target element must carry `id="main-content"` for the link to work.
 */
export const SkipLink: FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded focus:outline-none"
  >
    Skip to main content
  </a>
);

SkipLink.displayName = 'SkipLink';

export default SkipLink;

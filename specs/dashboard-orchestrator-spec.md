# Feature: DashboardOrchestrator

## Context
- Top-level production hardening layer for the Customer Intelligence Dashboard
- Transforms the existing prototype into a business-critical, production-ready application
- Consumed by all internal teams (sales, customer success, engineering) relying on continuous dashboard availability
- Wraps and coordinates all existing widgets: CustomerSelector, CustomerCard, CustomerHealthDisplay, AlertsPanel, MarketIntelligenceWidget
- Adds multi-level error isolation, data export, performance optimizations, accessibility compliance, and deployment configuration

## Requirements

### Functional Requirements

#### Error Handling and Resilience
- `DashboardErrorBoundary` at application level: catches unrecoverable errors, shows friendly fallback page with support contact and refresh option
- `WidgetErrorBoundary` per widget: isolates failures so a single broken widget does not crash siblings; shows per-widget error card with retry button
- Custom error classes with categorization (`NetworkError`, `ValidationError`, `RenderError`) and structured context
- Automatic error reporting to console (development) and external monitor hook (production)
- Retry limit (3 attempts) with exponential back-off before surfacing permanent error state to user

#### Data Export and Portability
- Export customer data in **CSV** and **JSON** formats with configurable filters (date range, customer segment, health tier)
- Export health score reports including historical data and per-factor breakdowns
- Export alert history and audit logs for compliance
- Export market intelligence summaries
- Progress indicator and cancellation support for long-running exports
- File naming: `{dataType}_{segment}_{YYYY-MM-DD}.{ext}` (e.g., `customers_critical_2026-03-11.csv`)

#### Performance Optimization
- `React.memo` and `useMemo` for expensive widget components; `useCallback` stabilizing event handlers
- `React.lazy` + `Suspense` boundaries for code-split widgets loaded on demand
- Virtual scrolling for customer lists exceeding 50 rows
- Service worker registration for offline caching of static assets and last-known dashboard state
- Memory leak prevention: cancel in-flight fetch requests on unmount; clear intervals/timeouts

#### Accessibility Compliance (WCAG 2.1 AA)
- Semantic HTML landmarks (`<main>`, `<nav>`, `<aside>`, `<section>`, proper heading hierarchy)
- All interactive elements keyboard-reachable; logical tab order matching visual flow
- Skip-to-main-content link as first focusable element
- Focus trap in modals and slide-over panels
- ARIA live regions for dynamic content (new alerts, score updates, export progress)
- All informational icons and chart elements have descriptive `aria-label` or `<title>` equivalents
- Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text and UI components
- High-contrast mode support via `prefers-contrast` media query

#### Security Hardening
- `Content-Security-Policy` header restricting scripts to `'self'` and approved CDN origins
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- All user inputs and external API responses sanitized before rendering
- Client-side rate limiting on export actions (max 5 exports per minute per session)
- Secure session management: no sensitive tokens in `localStorage`; use `httpOnly` cookies
- Error messages never expose stack traces, file paths, or internal data to the client

### User Interface Requirements
- Dashboard shell with top navigation bar, sidebar for customer selection, and main content grid
- Export panel accessible from a persistent toolbar button; shows format selector, filters, progress bar, and cancel/download controls
- Error fallback components maintain dashboard chrome (navigation remains usable)
- Loading skeletons for each widget during initial data fetch and lazy-load
- Toast notifications for export completion, dismissal confirmations, and non-critical errors

### Data Requirements
- Export filter options: `dateRange: { from: string; to: string }`, `segment: 'all'|'healthy'|'warning'|'critical'`, `customerId?: string`
- Export audit log entry: `{ exportId: string; userId: string; dataType: string; filters: ExportFilters; initiatedAt: string; completedAt?: string; rowCount?: number }`
- Error report payload: `{ errorId: string; type: string; message: string; componentStack?: string; timestamp: string; userId?: string }`

### Integration Requirements
- Wraps all existing widget components without modifying their internal logic
- Unified export system pulls data from health calculator, alerts engine, and market intelligence service
- Performance optimizations applied to existing components via HOC or co-located memo wrappers
- Accessibility enhancements added without altering widget prop interfaces
- Health check endpoint at `/api/health` returning `{ status: 'ok'|'degraded'|'down'; dependencies: Record<string, 'ok'|'error'>; timestamp: string }`

## Constraints

### Technical Stack
- Next.js 15 (App Router) with `next.config.ts` security headers and production build optimizations
- React 19 — error boundaries via class components; `Suspense` + `lazy` for code splitting
- TypeScript strict mode — no `any`
- Tailwind CSS v4 — `prefers-contrast` and `prefers-reduced-motion` variants used where appropriate
- Service worker via `next-pwa` or custom `public/sw.js`

### Performance Requirements (Core Web Vitals targets)
- First Contentful Paint (FCP): < 1.5 s on standard broadband
- Largest Contentful Paint (LCP): < 2.5 s
- Cumulative Layout Shift (CLS): < 0.1
- Time to Interactive (TTI): < 3.5 s
- Smooth 60 fps interactions; no jank during widget transitions
- Bundle size: total JS < 200 KB gzipped for initial route

### Design Constraints
- Dashboard grid: CSS Grid, 12-column, with defined breakpoints (mobile 1-col, tablet 2-col, desktop 3-col)
- Export panel: slide-over drawer on desktop, full-screen modal on mobile
- Error boundary fallbacks preserve dashboard chrome; widget error cards are 1-grid-cell wide
- Responsive breakpoints: 320px (mobile), 768px (tablet), 1 024px (desktop), 1 280px (wide)

### File Structure and Naming Conventions
```
src/
  app/
    api/
      health/
        route.ts                    # Health check endpoint
  components/
    DashboardOrchestrator.tsx       # Top-level layout + Suspense + error boundaries
    DashboardErrorBoundary.tsx      # App-level class component error boundary
    WidgetErrorBoundary.tsx         # Per-widget class component error boundary
    ExportPanel.tsx                 # Export UI with filters and progress
    SkipLink.tsx                    # Accessibility skip-to-main link
  lib/
    exportUtils.ts                  # Format-specific export handlers (CSV, JSON)
    errorReporter.ts                # Centralized error reporting hook
    rateLimiter.ts                  # Client-side rate limiting utility
  hooks/
    useExport.ts                    # Export state management hook
    useErrorReporting.ts
```

### Props Interface and TypeScript Definitions
```typescript
// DashboardErrorBoundary.tsx
export interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

// WidgetErrorBoundary.tsx
export interface WidgetErrorBoundaryProps {
  children: React.ReactNode;
  widgetName: string;
  onRetry?: () => void;
}

// ExportPanel.tsx
export interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ExportFilters {
  dateRange: { from: string; to: string };
  segment: 'all' | 'healthy' | 'warning' | 'critical';
  customerId?: string;
  format: 'csv' | 'json';
  dataType: 'customers' | 'health-scores' | 'alerts' | 'market-intelligence';
}
```

### Security Considerations
- CSP policy must be reviewed before each production deployment
- Export files must not include internal system fields (`__typename`, DB row IDs, etc.)
- Rate limiter state stored in `sessionStorage`, never sent to server
- All dynamic content rendered via React (no `innerHTML` or `dangerouslySetInnerHTML`)
- Error reporter must strip PII before sending to external monitoring

## Acceptance Criteria

### Error Boundaries
- [ ] A thrown error inside any widget is caught by `WidgetErrorBoundary`; sibling widgets remain functional
- [ ] `DashboardErrorBoundary` renders a full-page fallback for unrecoverable app-level errors
- [ ] Retry button in `WidgetErrorBoundary` resets error state and remounts the child
- [ ] After 3 failed retries, permanent error card is shown with support contact link
- [ ] Error details are never visible in production UI (only in development mode)

### Data Export
- [ ] CSV and JSON exports download correctly for all four data types
- [ ] Export filters correctly scope the output (date range, segment, customer)
- [ ] File names follow `{dataType}_{segment}_{YYYY-MM-DD}.{ext}` convention
- [ ] Progress indicator updates during export; cancel button aborts the operation
- [ ] Client-side rate limiter blocks more than 5 export requests per minute

### Performance
- [ ] Lighthouse performance score ≥ 90 on production build
- [ ] LCP ≤ 2.5 s, CLS ≤ 0.1, FCP ≤ 1.5 s measured with WebPageTest or Lighthouse CI
- [ ] `React.lazy` widgets do not block initial render; Suspense fallbacks appear correctly
- [ ] Virtual scrolling renders only visible rows for customer lists > 50 items
- [ ] No memory leaks detected in DevTools heap snapshot after 10 customer selection changes

### Accessibility
- [ ] Automated axe-core scan returns zero critical or serious violations
- [ ] All widgets are fully operable by keyboard alone (Tab, Enter, Space, Escape, arrow keys)
- [ ] Skip-to-main link is the first focusable element and visually appears on focus
- [ ] ARIA live region announces new alerts within 1 s of arrival
- [ ] Color contrast passes WCAG 2.1 AA for all text and interactive elements

### Security
- [ ] `Content-Security-Policy`, `X-Frame-Options`, and `X-Content-Type-Options` headers present on all responses
- [ ] No stack traces or file paths appear in error messages served to the client
- [ ] Export endpoint rejects requests that exceed the rate limit with HTTP 429
- [ ] All user-provided filter values are validated server-side before use

### Health Check
- [ ] `GET /api/health` returns 200 with `{ status: 'ok', ... }` when all dependencies are available
- [ ] Returns `{ status: 'degraded', ... }` with per-dependency detail when a non-critical dependency is unavailable
- [ ] Response time < 200 ms under normal load

### Integration
- [ ] TypeScript strict mode passes with no errors across all new and modified files
- [ ] No existing widget prop interfaces modified by orchestrator additions
- [ ] Production build (`next build`) completes without warnings

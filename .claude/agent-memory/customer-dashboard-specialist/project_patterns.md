---
name: project_patterns
description: Established component patterns, health score thresholds, TypeScript conventions, and design constraints for this Customer Intelligence Dashboard project
type: project
---

## Health Score Thresholds
- Red / Critical: 0–30
- Yellow / Warning: 31–70
- Green / Healthy: 71–100
- Implemented and centralised in `src/components/HealthIndicator.tsx` via `getTier(score)`.
- All components that need colour-coded health visuals MUST delegate to `HealthIndicator` rather than re-implementing the logic.

## Customer Interface (src/data/mock-customers.ts)
```typescript
interface Customer {
  id: string;
  name: string;
  company: string;
  healthScore: number;         // 0-100
  email?: string;
  subscriptionTier?: 'basic' | 'premium' | 'enterprise';
  domains?: string[];          // customer websites to health-check
  createdAt?: string;
  updatedAt?: string;
}
```

## Subscription Tier Badge Colours
- basic:      bg-gray-100 / text-gray-600
- premium:    bg-blue-100 / text-blue-700
- enterprise: bg-purple-100 / text-purple-700

## HealthIndicator API
- `variant`: "badge" (default) | "dot" | "bar"
- `size`: "sm" | "md" | "lg"
- `showScore`: boolean (default true for badge)
- `showLabel`: boolean (default false) — shows "Critical" / "Warning" / "Healthy"
- `className`: optional Tailwind overrides

## Component Conventions
- `'use client'` required whenever component has event handlers or interactive callbacks.
- Props types use `Pick<Customer, ...> & Partial<Pick<Customer, ...>>` to stay structurally aligned with the data model without requiring every field.
- `satisfies` operator used for constant maps to keep literal inference while enforcing the shape.
- `displayName` always set on exported named components for React DevTools.
- No `cn()` / `clsx` / `tailwind-merge` installed — class composition done with array `.filter(Boolean).join(' ')`.
- Card base classes: `rounded-xl border border-gray-200 bg-white p-4 shadow-sm`.
- Interactive card adds: `cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`.

## Design Constraints
- Max card width: 400px (`max-w-[400px]`)
- Min card height: 120px (`min-h-[120px]`)
- Responsive breakpoints: mobile 320px+, tablet 768px+, desktop 1024px+
- Grid used in page.tsx for cards: `grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`

## Security Pattern
- Never use `dangerouslySetInnerHTML` for customer data; always render as React text nodes.
- No sensitive customer data (email, ID) logged to console.

## File Structure
- Components: `src/components/`
- Mock data + types: `src/data/mock-customers.ts`
- App router page: `src/app/page.tsx` (client component due to dynamic require() demo)
- Pure business logic: `src/lib/` (no React imports — safe for Server Components, API routes, tests)

## Health Score Calculator (src/lib/healthCalculator.ts)
- Four input interfaces: `PaymentInput`, `EngagementInput`, `ContractInput`, `SupportInput`
- Output: `HealthScoreResult` with `overallScore`, `riskLevel`, `breakdown`, `trend`, optional `previousScore`
- Weights: payment 40%, engagement 30%, contract 20%, support 10%
- Risk tiers mirror HealthIndicator thresholds: >=71 healthy, 31-70 warning, <=30 critical
- Trend: +5 delta = improving, -5 delta = declining, else stable
- Invalid inputs throw `HealthCalculatorError` (negative values, satisfactionScore outside 0-5)
- All factor functions are individually exported and unit-testable

## CustomerHealthDisplay (src/components/CustomerHealthDisplay.tsx)
- `'use client'` widget; props: `customerId`, `healthData: HealthScoreResult | null`, `isLoading`, `error`
- Four UI states: loading (skeleton), error (red alert), empty, data
- Widget container: `bg-white rounded-lg shadow p-6`
- Trend arrows: ↑ green (improving), → gray (stable), ↓ red (declining)
- Factor breakdown: 4 rows using HealthIndicator variant="bar" size="sm"
- `FACTOR_META` typed with `as const satisfies ReadonlyArray<...>` for key safety

## MarketIntelligenceService (src/lib/marketIntelligenceService.ts)
- Singleton exported as `marketIntelligenceService`
- `getMarketData(company): Promise<MarketIntelligenceData>` — throws `MarketIntelligenceError` code `'INVALID_INPUT'` when sanitised name is empty
- Input sanitisation: strips chars not matching `[a-zA-Z0-9 \-.]`, trims, truncates to 100 chars
- In-memory cache (Map) with 10-minute TTL; cache key is lowercase sanitised name
- Mock data generation: deterministic hash (djb2) of lowercased name seeds headline selection and sentiment nudge; no external API calls
- Simulated latency: 200–500 ms via `Math.random() * 300 + 200`
- Core types: `MarketHeadline`, `MarketSentiment`, `MarketIntelligenceData`, `MarketIntelligenceError`

## API Route: GET /api/market-intelligence/[company]
- File: `src/app/api/market-intelligence/[company]/route.ts`
- Next.js 15 App Router; params is `Promise<{ company: string }>` — must be awaited
- Returns 400 for empty/invalid company; 500 with generic message for unexpected errors
- Sets `Cache-Control: max-age=600` on successful responses
- Decodes the route segment with `decodeURIComponent` before passing to service

## MarketIntelligenceWidget (src/components/MarketIntelligenceWidget.tsx)
- `'use client'`; props: `company?: string`, `className?: string`
- Fetches from `/api/market-intelligence/{company}` using `fetch()`
- Stale-fetch guard: `fetchIdRef` (useRef counter) discards responses from superseded requests
- Four UI states: empty (no company + blank input), loading (skeleton), error (alert + Retry button), data
- `handleRetry` calls the API inline (bypasses effect) by incrementing `fetchIdRef` directly — avoids the React bail-out on same-value setState
- Sentiment badge colours: positive=green-100/green-800/green-200, neutral=yellow-100/yellow-800/yellow-200, negative=red-100/red-800/red-200
- Confidence displayed as integer percentage via `Math.round(confidence * 100)`
- Headlines: up to 3 items; title `line-clamp-2`, `<a>` only when `url` is present, date in `<time>` element
- Widget container: `bg-white rounded-lg shadow p-6 w-full`

## Alert Engine (src/lib/alerts.ts)
- Pure module, no React imports — safe for Server Components, API routes, tests
- Core interfaces: `AlertRule`, `Alert`, `CustomerSnapshot`, `AlertEngineInput`
- `AlertEngineError` extends Error (same pattern as `HealthCalculatorError`)
- `ALERT_RULES` constant exported as `satisfies Record<string, AlertRule>` for key safety
- `alertEngine(input: AlertEngineInput): Alert[]` — main entry point
- Alert id format: `${customerId}_${ruleType}_${Date.now()}`
- Deduplication: skips rule if existingAlerts already has an undismissed alert with same customerId + ruleType
- HIGH rules: payment_overdue (>30 days or amount>0 with days>0), health_drop (>20 pt drop), login_drop (>50% drop), contract_expiration (<90 days + score<50)
- MEDIUM rules: support_spike (recentTicketCount>3 OR escalatedTickets>0), feature_stall (noNewFeatureUsageDays>30 AND isGrowingAccount)
- All numeric inputs validated; negative values throw AlertEngineError

## alertRules.ts (src/lib/alertRules.ts)
- Pure constants module, no React imports
- `ALERT_THRESHOLDS as const`: paymentOverdueDays=30, healthScoreDrop=20, loginDropPercent=0.5, contractExpiryDays=90, contractExpiryHealthScore=50, supportTicketSpike=3, featureStallDays=30
- `COOLDOWN_HOURS as const`: high=24, medium=72

## predictiveIntelligence.ts (src/lib/predictiveIntelligence.ts)
- Pure module, no React imports
- `PredictiveInsight` interface: alert, marketContext (sentiment/summary/relevantHeadlines[2] or null), confidence, recommendedAction
- `PredictiveIntelligenceError` extends Error with name set in constructor
- `synthesizeInsights(alerts, marketData, customerHealthScore?)`: pure, deterministic
- Confidence logic: baseline from alert.priority (high→high, medium→medium); upgrade medium→high when marketData.sentiment=negative AND healthScore<60; downgrade any→low when sentiment=positive AND healthScore>70
- marketContext.summary format: "Market sentiment for {company} is {label} with {pct}% confidence"
- relevantHeadlines = marketData.headlines.slice(0, 2)
- Returns sorted high→medium→low by CONFIDENCE_ORDER lookup

## InsightCard (src/components/InsightCard.tsx)
- `'use client'`; props: insight, onDismiss, onAction, onSnooze(alertId, 4|24)
- Local state: isExpanded (useState), snoozeOpen (useState)
- Priority left border: high=border-l-4 border-red-500, medium=border-l-4 border-yellow-500
- Confidence badge: high=bg-red-100 text-red-800, medium=bg-yellow-100 text-yellow-800, low=bg-blue-100 text-blue-800
- Collapsed: rule label + confidence badge + message (line-clamp-2) + Expand button
- Expanded: full message, triggered time in `<time>`, market context block (summary + 2 headlines line-clamp-1), recommended action, Dismiss/Mark Actioned/Snooze controls
- Snooze: relative-positioned dropdown menu with 4h and 24h options, aria-haspopup/aria-expanded

## AlertHistory (src/components/AlertHistory.tsx)
- `'use client'`; props: insights (resolved ones only), onRestore?(alertId)
- Each row: rule label, confidence badge, triggered timestamp in `<time>`, status label (dismissed→"Dismissed", else "Resolved")
- Optional Restore button per row when onRestore provided
- Empty state: "No alert history"

## PredictiveIntelligencePanel (src/components/PredictiveIntelligencePanel.tsx)
- `'use client'`; props: customerId, company?, className?
- State managed with useReducer (panelReducer); action types: LOADING_START/SUCCESS/ERROR, DISMISS, ACTION, SNOOZE, TOGGLE_HISTORY
- DISMISS marks alert.dismissed=true; ACTION and SNOOZE also mark dismissed=true (removes from active view)
- buildMockSnapshot(customerId): djb2 hash of customerId → scenario 0–5 covering varied alert conditions
- On mount/customerId change: runs alertEngine, optionally fetches /api/market-intelligence/{company}, calls synthesizeInsights
- Stale-fetch guard: evalIdRef (useRef counter) discards responses from superseded evaluations
- Market fetch failures are caught silently; insights remain valid without market data
- Active insights = insights where alert.dismissed===false; history = dismissed===true
- "View history (N)" toggle button; AlertHistory rendered below when open
- Exported as React.memo(PredictiveIntelligencePanelBase); displayName set on base component

## DashboardOrchestrator (src/components/DashboardOrchestrator.tsx)
- `'use client'`; props: `className?: string`
- Wraps entire tree in `DashboardErrorBoundary`
- Each widget wrapped in `WidgetErrorBoundary` with a `widgetName` prop
- All 5 widgets (CustomerSelector, CustomerHealthDisplay, AlertsPanel, MarketIntelligenceWidget, PredictiveIntelligencePanel) are React.lazy + Suspense with a `WidgetSkeleton` fallback
- Layout: sticky header + two-column CSS grid (320px selector col | auto widget col); widget col uses `md:grid-cols-2`
- State: `selectedCustomer: Customer | null`, `exportPanelOpen: boolean`
- `buildHealthData(customer)` derives PaymentInput/EngagementInput/ContractInput/SupportInput from `customer.healthScore` (0–100 mapping), then calls `calculateHealthScore`
- `SkipLink` is the very first element; `id="main-content"` on `<main tabIndex={-1}>`
- Export button in header opens `ExportPanel` slide-over

## DashboardErrorBoundary (src/components/DashboardErrorBoundary.tsx)
- Class component; `'use client'`; props: `children`, `onError?(error, info)`
- Full-page fallback: red icon, "Something went wrong" h1, support contact text, "Refresh Page" button (calls window.location.reload())
- Dev mode shows `<pre>` with error.message; production hides it
- Calls `reportError` from `../lib/errorReporter` in componentDidCatch
- Static displayName set as `static displayName = 'DashboardErrorBoundary'`

## WidgetErrorBoundary (src/components/WidgetErrorBoundary.tsx)
- Class component; `'use client'`; props: `children`, `widgetName: string`, `onRetry?()`
- MAX_RETRIES = 3; state: `{ hasError: boolean, retryCount: number }`
- handleRetry: increments retryCount, resets hasError (calls onRetry prop if provided)
- After 3 retries: shows permanent error card with "Contact support" message, no Retry button
- Retry button shows remaining attempts count
- Calls `reportError` in componentDidCatch

## SkipLink (src/components/SkipLink.tsx)
- Server Component (no 'use client'); no props
- Single `<a href="#main-content">` with sr-only/focus:not-sr-only pattern
- Always rendered as first child inside DashboardOrchestrator

## ExportPanel (src/components/ExportPanel.tsx)
- `'use client'`; props: `isOpen: boolean`, `onClose: () => void`
- Slide-over drawer: fixed right panel with backdrop overlay; returns null when !isOpen
- Form: dataType select, format radio (csv/json), segment select, date from/to
- Rate limit: `checkRateLimit('export', 5)` — 5 exports per minute
- Progress simulation: setInterval ticking PROGRESS_INCREMENT every 80ms toward 100 in ~1800ms
- On complete: calls generateExportData, getFilename, downloadFile, then onClose
- Cancel during export: clears interval only (does not close panel); Cancel button closes panel

## lib/exportUtils.ts
- `ExportFilters` interface exported from both exportUtils.ts AND re-exported from ExportPanel.tsx
- `generateExportData(filters)` — uses mockCustomers for 'customers' type; placeholder for others
- `scoreToSegment(score)` internal helper mirrors HealthIndicator thresholds (71+ healthy, 31-70 warning, 0-30 critical)
- `getFilename(filters)` — `{dataType}_{segment}_{YYYY-MM-DD}.{ext}` using `new Date().toISOString().slice(0, 10)`
- `downloadFile(content, filename, mimeType)` — Blob + objectURL + hidden anchor click + revokeObjectURL

## lib/errorReporter.ts
- `reportError(error, context?)` — dev: console.error with full context; prod: console.error message only
- SENSITIVE_KEYS set: email, password, token, apiKey, api_key, secret, creditCard, credit_card, ssn, authorization
- `stripSensitiveFields` does shallow scrub of context; nested PII is caller's responsibility

## lib/rateLimiter.ts
- `checkRateLimit(action, maxPerMinute): boolean` — sessionStorage-backed, rolling 60-second window
- Storage key prefix: `'rl_'`; timestamps stored as JSON number array
- Prunes entries older than 60_000ms before every check
- Returns true (allow) when count < limit; false (block) when at or over limit
- Silently fail-open on sessionStorage errors

## GET /api/health
- File: `src/app/api/health/route.ts`
- Returns `{ status: 'ok'|'degraded'|'down', dependencies: Record<string,'ok'|'error'>, timestamp: string }`
- All mock deps always 'ok'; deriveStatus: all ok→ok, all error→down, mix→degraded
- Always returns HTTP 200 (status in body, not HTTP code)

## AlertsPanel (src/components/AlertsPanel.tsx)
- `'use client'`; props: `alerts`, `isLoading`, `error`, `onDismiss(alertId)`, `onAction(alertId)`
- Filters dismissed alerts (`dismissed === true`) before display
- Sorts remaining alerts: high priority before medium via `PRIORITY_ORDER` lookup
- Priority styles: high = bg-red-50/border-red-200/badge bg-red-100 text-red-800, medium = bg-yellow-50/border-yellow-200/badge bg-yellow-100 text-yellow-800
- `PRIORITY_STYLES` typed as `satisfies Record<Alert['priority'], ...>`
- `formatRuleType()` maps ruleType keys to labels using `RULE_TYPE_LABELS`; falls back to title-casing the raw string
- `formatTriggeredAt()` uses `toLocaleString()` with explicit options; falls back to raw ISO string on invalid date
- Timestamp rendered in a `<time dateTime={isoString}>` element
- Four UI states: loading (3-card skeleton), error (red alert), empty ("all customers on track"), data (alert list)
- Widget container: `bg-white rounded-lg shadow p-6`

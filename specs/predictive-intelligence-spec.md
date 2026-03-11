# Feature: PredictiveIntelligence

## Context
- Unified predictive layer for the Customer Intelligence Dashboard combining behavioral alert detection with market context
- Correlates internal customer signals (payment risk, engagement drops, support spikes) with external market sentiment to surface higher-confidence insights
- Used by account managers and customer success teams to prioritize outreach with full situational awareness
- Sits alongside CustomerHealthDisplay and CustomerSelector; enriches alert recommendations with market data from `MarketIntelligenceService`
- Depends on: `lib/alerts.ts` (rules engine), `lib/marketIntelligenceService.ts` (market data), and `CustomerSelector` for reactive updates

## Requirements

### Functional Requirements

#### Alert Rules Engine
- Multi-tier priority system:
  - **High priority** (immediate action required):
    - Payment overdue > 30 days OR health score drops > 20 points in 7 days
    - Login frequency drops > 50% compared to 30-day average
    - Contract expires < 90 days AND health score < 50
  - **Medium priority** (monitor closely):
    - > 3 support tickets in 7 days OR any escalated ticket
    - No new feature usage in 30 days for accounts flagged as growing
- Configurable thresholds per rule type (stored as constants in `lib/alertRules.ts`)
- Cooldown periods per rule type to prevent alert spam (default: 24 h for high, 72 h for medium)
- Deduplication: one active alert per `customerId + ruleType` pair within the cooldown window

#### Market Context Enrichment
- Fetch market sentiment and headlines for the selected customer's company via `MarketIntelligenceService`
- Correlate market sentiment with alert priority: negative market sentiment upgrades a medium alert to high when customer health score < 60
- Surface market context in alert detail panels ("Company X is trending negative in recent news — 3 headlines suggest sector headwinds")
- Cache market data per company for 10 minutes (delegated to service layer); do not re-fetch on every alert evaluation

#### Insight Synthesis
- `synthesizeInsights` pure function that combines `Alert[]` and `MarketIntelligenceData` into `PredictiveInsight[]`
- Each `PredictiveInsight` includes: root alert, market context summary, recommended action, and confidence level (low / medium / high)
- Confidence level derived from: alert priority × market sentiment alignment × health score severity

#### Alert Management
- Dismiss, "Mark actioned", and snooze (4 h / 24 h) controls per insight
- Alert history view showing resolved and snoozed insights with outcome notes
- Audit log entry written on every state change (dismiss, action, snooze)

### User Interface Requirements
- `PredictiveIntelligencePanel` widget:
  - Prioritized insight list: high-priority insights at top, color-coded severity badges
  - Each insight card: customer name, rule type label, confidence badge, market context snippet, recommended action
  - Expand/collapse detail section showing: full alert reasoning, top 2 relevant headlines, suggested next steps
  - Dismiss, action, and snooze controls inline per card
  - "View history" toggle revealing resolved/snoozed insights
  - Loading skeleton during initial fetch
  - Error state with message and retry button
  - Empty state: "No active alerts — all customers are on track"
- Widget updates in real-time when `CustomerSelector` changes or when market data refreshes

### Data Requirements
```typescript
export interface AlertRule {
  id: string;
  type: 'payment_risk' | 'engagement_cliff' | 'contract_expiration' | 'support_spike' | 'feature_stall';
  priority: 'high' | 'medium';
  cooldownHours: number;
}

export interface Alert {
  id: string;
  customerId: string;
  rule: AlertRule;
  message: string;
  recommendedAction: string;
  triggeredAt: string;        // ISO 8601
  status: 'active' | 'actioned' | 'dismissed' | 'snoozed';
  snoozedUntil?: string;      // ISO 8601
}

export interface PredictiveInsight {
  alert: Alert;
  marketContext: {
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    summary: string;
    relevantHeadlines: MarketHeadline[];
  } | null;
  confidence: 'low' | 'medium' | 'high';
  recommendedAction: string;
}
```
- All TypeScript interfaces exported from `lib/alerts.ts` and `lib/predictiveIntelligence.ts`

### Integration Requirements
- `alertEngine` pure function in `lib/alerts.ts` receives customer snapshot, returns `Alert[]`
- `synthesizeInsights` pure function in `lib/predictiveIntelligence.ts` receives `Alert[]` + `MarketIntelligenceData | null`, returns `PredictiveInsight[]`
- `PredictiveIntelligencePanel` manages fetch orchestration and local insight state
- Market data fetched via existing `MarketIntelligenceService.getMarketData(company)` — no new API routes needed
- Consistent loading/error/empty-state patterns with `CustomerHealthDisplay` and `MarketIntelligenceWidget`
- Color-coding system shared across all dashboard widgets (red / yellow / green)

## Constraints

### Technical Stack
- Next.js 15 (App Router)
- React 19 with hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useReducer` for insight state machine)
- TypeScript strict mode — no `any`
- Tailwind CSS v4 utility classes only

### Performance Requirements
- `alertEngine` evaluates all rules for a single customer in < 5 ms
- `synthesizeInsights` completes in < 2 ms (pure computation, no I/O)
- Market data cache hit response < 50 ms; cold fetch < 1 500 ms (via service layer)
- Deduplication check O(1) via `Map<customerId_ruleType, Alert>`
- `PredictiveIntelligencePanel` memoized; re-renders only when insights array reference changes

### Design Constraints
- Widget container: `bg-white rounded-lg shadow p-6` — matches existing dashboard sections
- Insight card max height: 200px collapsed, unconstrained when expanded
- Confidence badges: `high` → `bg-red-100 text-red-800`, `medium` → `bg-yellow-100 text-yellow-800`, `low` → `bg-blue-100 text-blue-800`
- Alert severity colors: high → red border-left accent, medium → yellow border-left accent
- Responsive: single column on mobile (< 768px), full width in dashboard grid cell on md+
- Headline snippets: truncate at 1 line (`line-clamp-1`); full title on hover

### File Structure and Naming Conventions
```
src/
  lib/
    alerts.ts                        # Alert rules engine + interfaces
    alertRules.ts                    # Configurable threshold constants
    predictiveIntelligence.ts        # synthesizeInsights + PredictiveInsight interface
    alerts.test.ts                   # Unit tests for rules engine
    predictiveIntelligence.test.ts   # Unit tests for insight synthesis
  components/
    PredictiveIntelligencePanel.tsx  # Main widget component
    InsightCard.tsx                  # Individual insight card (expand/collapse)
    AlertHistory.tsx                 # Historical insights view
```
- Error classes: `AlertEngineError extends Error`, `PredictiveIntelligenceError extends Error`
- All exported interfaces prefixed by domain: `Alert`, `AlertRule`, `PredictiveInsight`

### Props Interfaces
```typescript
// PredictiveIntelligencePanel.tsx
export interface PredictiveIntelligencePanelProps {
  customerId: string;
  company?: string;       // For market context enrichment
  className?: string;
}

// InsightCard.tsx
export interface InsightCardProps {
  insight: PredictiveInsight;
  onDismiss: (alertId: string) => void;
  onAction: (alertId: string) => void;
  onSnooze: (alertId: string, hours: 4 | 24) => void;
}
```

### Security Considerations
- Alert messages must not expose raw customer financial figures or internal IDs
- Market context snippets rendered via React default escaping (no `dangerouslySetInnerHTML`)
- Audit log entries must not include full customer PII — reference by `customerId` only
- Rate limiting on alert engine invocation: max 1 full evaluation per customer per 5 s in UI layer
- Company name passed to `MarketIntelligenceService` must be validated (max 100 chars, alphanumeric + spaces/hyphens/periods)

## Acceptance Criteria

### Alert Rules Engine
- [ ] All five high/medium rule types trigger correctly at their defined thresholds
- [ ] Rules do NOT trigger when data is within safe bounds
- [ ] Duplicate alerts for same `customerId + ruleType` within cooldown window are suppressed
- [ ] `alertEngine` returns an empty array when no thresholds are breached
- [ ] Each alert includes a non-empty `recommendedAction` string
- [ ] Unit tests cover all rules, boundary conditions, cooldown deduplication, and new-customer edge case

### Insight Synthesis
- [ ] `synthesizeInsights` upgrades a medium alert to high confidence when market sentiment is negative AND health score < 60
- [ ] Market context is `null` in returned insights when market data is unavailable (no crash)
- [ ] Confidence levels are deterministic for identical inputs (pure function, no randomness)
- [ ] Returned `PredictiveInsight[]` is sorted: high confidence first, then medium, then low
- [ ] Unit tests cover all correlation scenarios and edge cases (null market data, all alert types)

### UI Component
- [ ] `PredictiveIntelligencePanel` renders insight cards sorted by confidence (high first)
- [ ] High-priority insight cards display red severity accent; medium display yellow
- [ ] Expand/collapse detail section shows market context and relevant headlines when available
- [ ] Dismiss, action, and snooze controls call correct callbacks; card moves to history view after actioning
- [ ] Loading skeleton renders during fetch; error state shows retry button
- [ ] Empty state renders when no active insights
- [ ] Widget updates when `CustomerSelector` selection changes (new `customerId` prop triggers re-evaluation)
- [ ] Market context block is hidden (not broken) when `company` prop is not provided

### Integration
- [ ] Widget renders without layout breakage at 320px, 768px, and 1 024px viewports
- [ ] Error in `PredictiveIntelligencePanel` does not crash sibling widgets (wrapped by `WidgetErrorBoundary`)
- [ ] TypeScript strict mode passes with no errors across all new files
- [ ] Unit test coverage ≥ 90% for `lib/alerts.ts` and `lib/predictiveIntelligence.ts`
- [ ] Follows project code style and naming conventions

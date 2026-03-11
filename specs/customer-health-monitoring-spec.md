# Feature: CustomerHealthMonitoring

## Context
- Unified health monitoring system for the Customer Intelligence Dashboard
- Combines real-time health score calculation with proactive predictive alerting
- Used by account managers and customer success teams to identify at-risk accounts and act before churn
- Sits alongside CustomerCard, CustomerSelector, and MarketIntelligenceWidget in the dashboard grid
- Depends on: `lib/healthCalculator.ts` (pure calculation logic), `lib/alerts.ts` (alert rules engine), and `CustomerSelector` for reactive updates

## Requirements

### Functional Requirements
- Calculate customer health scores on a 0–100 scale with three risk tiers:
  - Healthy: 71–100
  - Warning: 31–70
  - Critical: 0–30
- Multi-factor weighted scoring:
  - Payment history: 40%
  - Engagement metrics: 30%
  - Contract information: 20%
  - Support data: 10%
- Individual scoring functions per factor, each returning a normalized 0–100 sub-score
- Main `calculateHealthScore` function composing all factor scores with trend direction (improving / stable / declining)
- Input validation with descriptive errors for all data inputs; safe edge-case handling for new/sparse customer data
- Alert rules engine evaluating health and behavioral thresholds to produce prioritized alerts:
  - **High priority**: Payment overdue > 30 days OR health score drops > 20 pts in 7 days; login frequency drops > 50% vs 30-day avg; contract expires < 90 days AND health score < 50
  - **Medium priority**: > 3 support tickets in 7 days OR escalated ticket; no new feature usage in 30 days for growing accounts
- Deduplication logic preventing repeat alerts for the same customer/issue within cooldown window
- Alert history tracking for audit and effectiveness analysis

### User Interface Requirements
- `CustomerHealthDisplay` widget:
  - Overall health score with color-coded ring/badge (red / yellow / green)
  - Expandable breakdown of per-factor scores
  - Trend direction indicator (↑ improving / → stable / ↓ declining)
  - Loading skeleton during data fetch
  - Error state with retry action
- `AlertsPanel` widget:
  - Prioritized alert list with color-coded severity badges (red = high, yellow = medium)
  - Alert detail row: customer name, rule type, recommended action, timestamp
  - Dismiss and "Mark actioned" controls
  - Historical alerts toggle view
- Both widgets update in real-time when `CustomerSelector` selection changes

### Data Requirements
- **Payment input**: `daysSinceLastPayment: number`, `avgPaymentDelayDays: number`, `overdueAmount: number`
- **Engagement input**: `loginFrequencyPerMonth: number`, `featureUsageCount: number`, `openSupportTickets: number`
- **Contract input**: `daysUntilRenewal: number`, `contractValue: number`, `recentUpgrade: boolean`
- **Support input**: `avgResolutionTimeHours: number`, `satisfactionScore: number` (0–5), `escalationCount: number`
- `HealthScoreResult`: `{ overallScore: number; riskLevel: 'healthy'|'warning'|'critical'; breakdown: FactorBreakdown; trend: 'improving'|'stable'|'declining' }`
- `Alert`: `{ id: string; customerId: string; priority: 'high'|'medium'; ruleType: string; message: string; recommendedAction: string; triggeredAt: string; dismissed: boolean }`
- All TypeScript interfaces exported from their respective `lib/` files

### Integration Requirements
- Pure functions in `lib/healthCalculator.ts` — no side effects, no I/O
- Pure functions in `lib/alerts.ts` — alert engine receives customer state snapshots, returns `Alert[]`
- `CustomerHealthDisplay` and `AlertsPanel` subscribe to the same selected customer context
- Consistent loading/error/empty-state patterns with other dashboard widgets
- Color-coding system shared with `CustomerCard` health indicators and `MarketIntelligenceWidget` sentiment badges

## Constraints

### Technical Stack
- Next.js 15 (App Router)
- React 19 with hooks (`useState`, `useEffect`, `useCallback`, `useMemo`)
- TypeScript strict mode — no `any`
- Tailwind CSS v4 utility classes only

### Performance Requirements
- `calculateHealthScore` executes synchronously in < 1 ms per customer
- Alert engine evaluates all rules for a single customer in < 5 ms
- No unnecessary re-renders; memoize `CustomerHealthDisplay` and `AlertsPanel` where appropriate
- Deduplication check O(1) via Set/Map keyed by `customerId + ruleType`

### Design Constraints
- Widget containers: `bg-white rounded-lg shadow p-6` — matches existing dashboard sections
- Responsive: single column on mobile (< 768px), side-by-side on md+
- Health color thresholds: `red` (0–30), `yellow` (31–70), `green` (71–100) — same as `CustomerCard`
- Alert severity colors: high → `bg-red-100 text-red-800`, medium → `bg-yellow-100 text-yellow-800`

### File Structure and Naming Conventions
```
src/
  lib/
    healthCalculator.ts        # Pure calculation functions + TypeScript interfaces
    healthCalculator.test.ts   # Unit tests
    alerts.ts                  # Alert rules engine + interfaces
    alerts.test.ts             # Unit tests
  components/
    CustomerHealthDisplay.tsx  # Health score widget
    AlertsPanel.tsx            # Alerts list widget
```
- Error classes: `HealthCalculatorError extends Error`, `AlertEngineError extends Error`
- All exported interfaces prefixed by domain: `HealthScoreResult`, `FactorBreakdown`, `AlertRule`, `Alert`

### Props Interfaces
```typescript
// CustomerHealthDisplay.tsx
export interface CustomerHealthDisplayProps {
  customerId: string;
  healthData: HealthScoreResult | null;
  isLoading: boolean;
  error: string | null;
}

// AlertsPanel.tsx
export interface AlertsPanelProps {
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
  onDismiss: (alertId: string) => void;
  onAction: (alertId: string) => void;
}
```

### Security Considerations
- No sensitive customer financial data logged to console or included in error messages
- Input sanitization and strict TypeScript types prevent injection through malformed inputs
- Alert messages must not expose raw database values or internal system paths

## Acceptance Criteria

### Health Calculator
- [ ] `calculateHealthScore` returns a score 0–100 for valid inputs
- [ ] Weighted contributions sum correctly (payment 40%, engagement 30%, contract 20%, support 10%)
- [ ] Risk levels map correctly: Healthy (71–100), Warning (31–70), Critical (0–30)
- [ ] Each factor scoring function is independently testable and returns 0–100
- [ ] Invalid or missing inputs throw typed, descriptive errors
- [ ] New customer edge case (all zeroes/defaults) returns a valid defined score
- [ ] Trend direction (improving / stable / declining) is included in `HealthScoreResult`
- [ ] All functions have JSDoc comments explaining business logic and math

### Alert Rules Engine
- [ ] High-priority rules trigger correctly at defined thresholds (payment > 30 days overdue, login drop > 50%, etc.)
- [ ] Medium-priority rules trigger correctly (ticket spike, feature adoption stall)
- [ ] Duplicate alerts for same customer/rule within cooldown window are suppressed
- [ ] `alertEngine` returns an empty array when no thresholds are breached
- [ ] Each alert includes `recommendedAction` text relevant to the rule type
- [ ] Unit tests cover all rule types, boundary conditions, and deduplication logic

### UI Components
- [ ] `CustomerHealthDisplay` renders overall score, risk badge, per-factor breakdown, and trend indicator
- [ ] Loading and error states render correctly in `CustomerHealthDisplay`
- [ ] `AlertsPanel` renders alerts sorted by priority (high first), with severity badges
- [ ] Dismiss and action controls call the correct callbacks
- [ ] Both widgets update in real-time when `CustomerSelector` selection changes
- [ ] No layout breakage at 320px, 768px, and 1 024px viewports

### Integration
- [ ] TypeScript strict mode passes with no errors or warnings across all new files
- [ ] Unit test coverage ≥ 90% for `lib/healthCalculator.ts` and `lib/alerts.ts`
- [ ] Follows project code style and naming conventions

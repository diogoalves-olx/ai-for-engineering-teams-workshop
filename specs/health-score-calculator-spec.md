# Feature: Health Score Calculator

## Context
- Core business logic module for the Customer Intelligence Dashboard
- Provides predictive analytics for customer relationship health and churn risk
- Used by the CustomerHealthDisplay widget and any component requiring health scores
- Consumed by business analysts to monitor customer status and identify at-risk accounts
- Underpins real-time health score updates when customer selection changes in CustomerSelector

## Requirements

### Functional Requirements
- Calculate customer health scores on a 0-100 scale with risk level categorization
- Multi-factor weighted scoring:
  - Payment history: 40%
  - Engagement metrics: 30%
  - Contract information: 20%
  - Support data: 10%
- Risk level classification:
  - Healthy: 71–100
  - Warning: 31–70
  - Critical: 0–30
- Individual scoring functions per factor, each returning a normalized 0-100 sub-score
- Main `calculateHealthScore` function composing all factor scores into a final score
- Input validation with descriptive error messages for all data inputs
- Edge case handling for new customers (missing/sparse data) and zero-value inputs
- Trend analysis support (improving vs. declining score direction)

### User Interface Requirements
- `CustomerHealthDisplay` widget displaying:
  - Overall health score with color-coded visualization (red/yellow/green matching dashboard conventions)
  - Expandable breakdown of individual factor scores
  - Loading and error states consistent with other dashboard widgets
- Real-time score updates on customer selection change via CustomerSelector

### Data Requirements
- **Payment input**: days since last payment, average payment delay (days), overdue amount
- **Engagement input**: login frequency (logins/month), feature usage count, open support tickets
- **Contract input**: days until renewal, contract value, recent upgrade flag
- **Support input**: average resolution time (hours), satisfaction score (0-5), escalation count
- TypeScript interfaces exported for all input shapes and return types
- `HealthScoreResult` return type including: overall score, risk level, per-factor breakdown, trend direction

### Integration Requirements
- Pure functions in `lib/healthCalculator.ts` — no side effects, no external calls
- `CustomerHealthDisplay` component integrated with `CustomerSelector` for real-time updates
- Consistent error handling and loading state patterns with other dashboard components
- Dashboard layout integration maintaining responsive design
- Color-coding consistent with `CustomerCard` health indicators

## Constraints

### Technical Stack
- Next.js 15 (App Router)
- React 19
- TypeScript with strict mode
- Tailwind CSS for styling

### Performance Requirements
- Calculation runs synchronously in < 1ms per customer (suitable for real-time dashboard updates)
- Caching of repeated identical inputs recommended for dashboard responsiveness
- No unnecessary re-renders in `CustomerHealthDisplay` (memoize where appropriate)

### Design Constraints
- `CustomerHealthDisplay` follows existing widget sizing and spacing conventions
- Color thresholds match `CustomerCard`: red (0–30), yellow (31–70), green (71–100)
- Responsive breakpoints: mobile (320px+), tablet (768px+), desktop (1024px+)

### File Structure and Naming
- Calculator logic: `lib/healthCalculator.ts`
- UI component: `components/CustomerHealthDisplay.tsx`
- Props interface: `CustomerHealthDisplayProps` exported from component file
- Tests: `lib/healthCalculator.test.ts`
- TypeScript interfaces co-located in `lib/healthCalculator.ts` or a shared `types/` file

### Security Considerations
- No sensitive customer data logged to the console
- Input sanitization and type validation before processing
- Strict TypeScript types to prevent injection through malformed inputs

## Acceptance Criteria

- [ ] `calculateHealthScore` returns a score between 0 and 100 for valid inputs
- [ ] Weighted factor contributions sum correctly (payment 40%, engagement 30%, contract 20%, support 10%)
- [ ] Risk levels map correctly: Healthy (71–100), Warning (31–70), Critical (0–30)
- [ ] Each individual factor scoring function is independently testable and returns 0–100
- [ ] Invalid or missing inputs throw descriptive, typed errors
- [ ] New customer edge case (all zeroes/defaults) returns a defined, valid score
- [ ] Trend direction (improving/declining/stable) included in result
- [ ] `CustomerHealthDisplay` renders score, risk level, and per-factor breakdown
- [ ] Loading and error states render correctly in `CustomerHealthDisplay`
- [ ] Score updates in real-time when CustomerSelector selection changes
- [ ] All functions have JSDoc comments explaining business logic and math
- [ ] Unit tests cover all factor functions, edge cases, and validation errors
- [ ] TypeScript strict mode passes with no errors or warnings
- [ ] Follows project code style and naming conventions

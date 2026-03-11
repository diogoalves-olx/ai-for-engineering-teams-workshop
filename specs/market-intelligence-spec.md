# Feature: MarketIntelligenceWidget

## Context
- Provides real-time market sentiment and news analysis for a selected customer's company
- Lives in the Customer Intelligence Dashboard alongside CustomerCard, CustomerSelector, and CustomerHealthDisplay widgets
- Used by sales/account managers to understand market conditions before customer interactions
- Receives `company` name from the selected customer state in the Dashboard; displays sentiment, news count, and top headlines
- Depends on: `/api/market-intelligence/[company]` route and `MarketIntelligenceService`

## Requirements

### Functional Requirements
- Accept a company name as input (either via prop from Dashboard or manual entry field)
- Fetch market data from `/api/market-intelligence/[company]` on company change or manual submission
- Display overall market sentiment with label and confidence score
- Display total article count and last updated timestamp
- Display top 3 headlines with title, source, and publication date
- Support loading state while fetch is in progress
- Support error state with user-friendly message and retry action
- Support empty/no-company state with prompt to select or enter a company

### User Interface Requirements
- Input field for manual company name entry with a "Analyze" submit button
- Sentiment indicator badge: color-coded by label (`positive` → green, `neutral` → yellow, `negative` → red)
- Confidence score displayed as a percentage next to the sentiment label
- Article count and last updated shown in a subtitle row beneath the sentiment indicator
- Headlines list: ordered, each item shows title, source name, and relative/formatted publication date
- Loading skeleton or spinner replacing content area during fetch
- Error banner with message and "Retry" button
- Widget title: "Market Intelligence"

### Data Requirements
- API response shape:
  ```typescript
  interface MarketIntelligenceResponse {
    company: string;
    sentiment: {
      score: number;       // -1.0 to 1.0
      label: 'positive' | 'neutral' | 'negative';
      confidence: number;  // 0.0 to 1.0
    };
    articleCount: number;
    headlines: {
      title: string;
      source: string;
      publishedAt: string; // ISO 8601
      url?: string;
    }[];
    lastUpdated: string;   // ISO 8601
  }
  ```
- Cache TTL: 10 minutes (enforced in service layer; API returns cached data within TTL)
- Maximum headlines returned by API: 3

### Integration Requirements
- Props interface:
  ```typescript
  interface MarketIntelligenceWidgetProps {
    company?: string;         // Pre-populated from selected customer; triggers auto-fetch
    className?: string;
  }
  ```
- When `company` prop changes, automatically re-fetch (do not wait for manual submit)
- Export as named export: `export function MarketIntelligenceWidget`
- File location: `src/components/MarketIntelligenceWidget.tsx`

## Constraints

### Technical Stack
- Next.js 15 App Router; API route at `src/app/api/market-intelligence/[company]/route.ts`
- React 19 with hooks (`useState`, `useEffect`, `useCallback`)
- TypeScript strict mode — no `any`, all interfaces exported
- Tailwind CSS v4 utility classes only (no inline styles)
- Service class at `src/lib/marketIntelligenceService.ts`
- Mock data utilities imported from `@/data/mock-market-intelligence`

### Performance Requirements
- API response (including mock delay simulation): < 1 500 ms
- Component render on prop change: < 50 ms
- Re-fetch debounce for manual input: 300 ms after last keystroke
- Cache hit response: < 50 ms (no network round-trip)

### Design Constraints
- Widget container: `bg-white rounded-lg shadow p-6` — matches existing dashboard sections
- Minimum width: 320px; full width within grid cell
- Responsive: single column on mobile (< 768px), fits 2-col grid on md+
- Sentiment badge max-width: fits inline with confidence percentage on one line
- Headline titles: truncate at 2 lines (`line-clamp-2`); full title on hover (title attribute)
- Color system — use same Tailwind scale as health score indicators:
  - `positive`: `bg-green-100 text-green-800 border-green-200`
  - `neutral`: `bg-yellow-100 text-yellow-800 border-yellow-200`
  - `negative`: `bg-red-100 text-red-800 border-red-200`

### File Structure and Naming Conventions
```
src/
  app/
    api/
      market-intelligence/
        [company]/
          route.ts          # GET handler
  components/
    MarketIntelligenceWidget.tsx
  lib/
    marketIntelligenceService.ts
  data/
    mock-market-intelligence.ts   # already exists
```
- Class name: `MarketIntelligenceService`
- Custom error class: `MarketIntelligenceError extends Error` with `code: string` field
- All exported interfaces prefixed by domain: `MarketIntelligenceResponse`, `MarketIntelligenceWidgetProps`

### Props Interface and TypeScript Definitions
```typescript
// src/components/MarketIntelligenceWidget.tsx
export interface MarketIntelligenceWidgetProps {
  company?: string;
  className?: string;
}

// src/lib/marketIntelligenceService.ts
export interface MarketHeadline {
  title: string;
  source: string;
  publishedAt: string;
  url?: string;
}

export interface MarketSentiment {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface MarketIntelligenceData {
  company: string;
  sentiment: MarketSentiment;
  articleCount: number;
  headlines: MarketHeadline[];
  lastUpdated: string;
}

export class MarketIntelligenceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MarketIntelligenceError';
  }
}

export class MarketIntelligenceService {
  getMarketData(company: string): Promise<MarketIntelligenceData>;
}
```

### Security Considerations
- Company name parameter: strip non-alphanumeric characters except spaces, hyphens, and periods before use in mock generation; max length 100 characters
- API route must return 400 for empty or invalid company names
- No sensitive data in error messages returned to client
- No external network calls — mock data only; eliminates external API attack surface
- Input field: no `dangerouslySetInnerHTML`; sanitize display strings via React's default escaping
- API responses must set `Content-Type: application/json` and validate with TypeScript types before returning

## Acceptance Criteria

### API Route
- [ ] `GET /api/market-intelligence/acme` returns 200 with valid `MarketIntelligenceData` JSON
- [ ] `GET /api/market-intelligence/` (empty segment) returns 400 with error message
- [ ] Company names with special characters (e.g., `<script>`) are sanitized and do not cause errors
- [ ] Response is cached for 10 minutes; second identical request within TTL returns same `lastUpdated` value
- [ ] Simulated delay makes response arrive in 200–1 500 ms range

### Service Layer
- [ ] `MarketIntelligenceService.getMarketData('Acme')` resolves with correct shape
- [ ] Calling the same company twice within 10 minutes returns cached result (same object reference or matching `lastUpdated`)
- [ ] Expired cache entry triggers fresh mock data generation
- [ ] Throws `MarketIntelligenceError` with descriptive `code` on invalid input

### UI Component
- [ ] Renders "Market Intelligence" heading in all states
- [ ] When `company` prop is provided, fetches and displays data automatically without user interaction
- [ ] Sentiment badge shows correct color for `positive`, `neutral`, and `negative` labels
- [ ] Confidence displayed as integer percentage (e.g., `72%`)
- [ ] Exactly 3 headlines displayed when data is available; fewer shown if API returns fewer
- [ ] Each headline shows title, source, and formatted publication date
- [ ] Loading state replaces content area (not the heading) during fetch
- [ ] Error state shows message and functional "Retry" button that re-triggers fetch
- [ ] Empty state shown when no `company` prop and input field is blank
- [ ] Manual input submit button disabled while fetch is in progress
- [ ] Component is keyboard-navigable (input → button → headline links)

### Dashboard Integration
- [ ] Widget renders within the dashboard grid without layout breakage at 320px, 768px, and 1 024px viewports
- [ ] Selected customer's `company` field pre-populates the widget and triggers fetch
- [ ] Widget does not unmount/remount when a different customer is selected — only re-fetches
- [ ] Error in MarketIntelligenceWidget does not crash sibling widgets (error boundary wraps widget)

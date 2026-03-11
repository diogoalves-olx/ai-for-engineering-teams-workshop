# Feature: HealthIndicator Component

## Context
- Reusable visual component for the Customer Intelligence Dashboard
- Renders a color-coded health status badge/indicator based on a numeric score (0–100)
- Used across multiple components: `CustomerCard`, `CustomerHealthDisplay`, and any future dashboard widget that surfaces health data
- Consumed by business analysts scanning customer health at a glance
- Centralizes the health color-coding logic so all components stay visually consistent

## Requirements

### Functional Requirements
- Accept a numeric health score (0–100) and render a visual indicator matching the score range
- Color thresholds:
  - Red: 0–30 (Critical / Poor health)
  - Yellow: 31–70 (Warning / Moderate health)
  - Green: 71–100 (Healthy / Good health)
- Display the numeric score alongside the color indicator (optional via prop)
- Display a human-readable risk label alongside the color indicator (optional via prop):
  - Critical (0–30)
  - Warning (31–70)
  - Healthy (71–100)
- Support multiple visual variants:
  - `badge`: compact pill/badge shape (default, used in cards)
  - `dot`: small colored dot (used in dense lists)
  - `bar`: horizontal progress bar filling to the score percentage
- Accessible: include `aria-label` describing health status for screen readers

### User Interface Requirements
- Pill/badge variant: rounded pill with background color matching the health tier, containing score text and optional label
- Dot variant: small filled circle, color-coded, no text
- Bar variant: full-width horizontal bar filled proportionally to score (0–100%), color-coded
- Smooth color transitions when score changes (e.g., via CSS transition)
- Consistent sizing tokens: `sm`, `md` (default), `lg`

### Data Requirements
- Accepts a single `score` number prop (0–100)
- Optional `showScore` boolean to toggle numeric score display (default: `true` for badge, `false` for dot)
- Optional `showLabel` boolean to toggle risk label text display (default: `false`)
- Optional `variant` prop: `"badge" | "dot" | "bar"` (default: `"badge"`)
- Optional `size` prop: `"sm" | "md" | "lg"` (default: `"md"`)
- Optional `className` prop for Tailwind overrides

### Integration Requirements
- Replace inline color-coding logic in `CustomerCard` with `HealthIndicator`
- Used by `CustomerHealthDisplay` for the overall score visualization
- Exported from a shared component index for easy importing across the dashboard
- No internal state or data fetching — purely presentational

## Constraints

### Technical Stack and Frameworks
- Next.js 15 (App Router)
- React 19
- TypeScript with strict mode
- Tailwind CSS for styling (no custom CSS files)

### Performance Requirements
- Pure presentational component — no side effects, no async operations
- Renders in under 5ms; suitable for use in virtualized lists
- No layout shift on initial render

### Design Constraints
- Colors must match existing dashboard conventions:
  - Critical/Red: `bg-red-500` / `text-red-700`
  - Warning/Yellow: `bg-yellow-400` / `text-yellow-700`
  - Healthy/Green: `bg-green-500` / `text-green-700`
- Size scale:
  - `sm`: text-xs, compact padding
  - `md`: text-sm, standard padding
  - `lg`: text-base, generous padding
- Bar variant fills the full width of its container (no fixed width)
- Dot variant: 8px (`sm`), 12px (`md`), 16px (`lg`) diameter

### File Structure and Naming Conventions
- Component: `src/components/HealthIndicator.tsx`
- Props interface: `HealthIndicatorProps`, exported from the component file
- PascalCase component name; camelCase props

### Props Interface and TypeScript Definitions
```ts
export type HealthTier = "critical" | "warning" | "healthy";

export interface HealthIndicatorProps {
  score: number;
  variant?: "badge" | "dot" | "bar";
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  showLabel?: boolean;
  className?: string;
}
```

### Security Considerations
- Score value rendered as text content only — no `dangerouslySetInnerHTML`
- Input clamped to 0–100 range defensively to prevent broken visuals from invalid data
- No sensitive data exposed in DOM attributes

## Acceptance Criteria

- [ ] Renders red badge for scores 0–30, yellow for 31–70, green for 71–100
- [ ] `badge` variant renders a pill with background color and score text
- [ ] `dot` variant renders a small colored circle with no text
- [ ] `bar` variant renders a horizontal bar filled to the correct percentage with the correct color
- [ ] `showScore={false}` hides the numeric score from the badge
- [ ] `showLabel={true}` displays "Critical", "Warning", or "Healthy" alongside the indicator
- [ ] `size` prop applies correct sizing tokens for `sm`, `md`, and `lg`
- [ ] Score outside 0–100 is clamped and does not break the UI
- [ ] `aria-label` is present and accurately describes health status for screen readers
- [ ] `CustomerCard` uses `HealthIndicator` instead of inline color logic
- [ ] `HealthIndicatorProps` is exported and typed correctly in strict TypeScript mode
- [ ] No TypeScript errors or warnings in strict mode
- [ ] No console errors during render
- [ ] Follows project file structure and naming conventions

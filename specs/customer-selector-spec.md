# Feature: CustomerSelector Component

## Context
- Main customer selection interface for the Customer Intelligence Dashboard
- Container component that renders a grid of `CustomerCard` components
- Used by business analysts to quickly find and select a customer for detailed inspection
- Sits at the top level of the dashboard layout; drives downstream views via selected customer state

## Requirements

### Functional Requirements
- Render a responsive grid of `CustomerCard` components from the customer list
- Search/filter customers in real time by name or company (case-insensitive)
- Highlight the currently selected customer card visually
- Persist the selected customer across page interactions (within the same session)
- Show a "no results" message when the search query matches no customers
- Handle lists of 100+ customers without visible performance degradation

### User Interface Requirements
- Search input at the top of the component with a placeholder ("Search by name or company…")
- Grid layout: 1 column on mobile, 2 on tablet, 3+ on desktop
- Selected card has a distinct border/highlight (e.g., ring or border color change)
- "No results" empty state message when filter returns zero cards
- Loading state placeholder (skeleton or spinner) while data is being fetched

### Data Requirements
- Accepts a `customers` array via props (typed as `Customer[]` from `src/data/mock-customers.ts`)
- Accepts an `onSelect` callback that receives the selected `Customer` object
- Optionally accepts a `selectedCustomerId` prop to control selection from the parent
- Mock data sourced from `src/data/mock-customers.ts`

### Integration Requirements
- Renders `CustomerCard` components for each filtered customer
- Passes `onClick` handler to each `CustomerCard` to trigger selection
- Exports `CustomerSelectorProps` TypeScript interface for use by the parent page/layout
- Parent component is responsible for storing and passing `selectedCustomerId`

## Constraints

### Technical Stack and Frameworks
- Next.js 15 (App Router), React 19, TypeScript (strict mode), Tailwind CSS

### Performance Requirements
- Filtering must remain responsive with 100+ customers (debounce search input by 150ms if needed)
- No layout shift when the filtered list changes
- Virtualization is not required for this workshop exercise

### Design Constraints
- Responsive breakpoints: mobile (320px+), tablet (768px+), desktop (1024px+)
- Grid gap uses Tailwind's default scale (`gap-4`)
- Search input width: full-width within the component container

### File Structure and Naming Conventions
- Component: `src/components/CustomerSelector.tsx`
- Props interface: `CustomerSelectorProps`, exported from the component file
- PascalCase for component name; camelCase for props

### Props Interface and TypeScript Definitions
```ts
import { Customer } from '@/data/mock-customers';

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomerId?: string;
  onSelect: (customer: Customer) => void;
}
```

### Security Considerations
- Render all customer data as text content only (no `dangerouslySetInnerHTML`)
- No sensitive data logged to the browser console
- TypeScript strict types to prevent unexpected data shapes

## Acceptance Criteria
- [ ] Renders a card for every customer in the `customers` prop
- [ ] Search input filters cards by name or company in real time (case-insensitive)
- [ ] Selected card is visually distinguished from unselected cards
- [ ] `onSelect` callback is called with the correct `Customer` object when a card is clicked
- [ ] "No results" message is displayed when the filter matches zero customers
- [ ] Responsive grid layout works at 320px, 768px, and 1024px+
- [ ] `CustomerSelectorProps` interface is exported and used by the parent component
- [ ] Passes TypeScript strict mode with no errors or warnings
- [ ] No console errors during render with 8+ customers

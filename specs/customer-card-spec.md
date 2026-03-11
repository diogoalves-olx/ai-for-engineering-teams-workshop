# Feature: CustomerCard Component

## Context
- Individual customer display component for the Customer Intelligence Dashboard
- Used within the `CustomerSelector` container component as part of a customer grid
- Provides at-a-glance customer information for quick identification by business analysts
- Foundation component for domain health monitoring integration

## Requirements

### Functional Requirements
- Display customer name, company name, and health score (0–100)
- Show customer domains (websites) for health monitoring context
- Display domain count when a customer has multiple domains
- Color-coded health indicator based on score:
  - Red (0–30): Poor health
  - Yellow (31–70): Moderate health
  - Green (71–100): Good health
- Basic responsive design for mobile and desktop
- Clean, card-based visual design

### User Interface Requirements
- Health score badge with color matching the score range
- Domain list or domain count label depending on number of domains
- Clear typography hierarchy: name > company > details
- Visual hover state to indicate interactivity

### Data Requirements
- Accepts a customer object via props
- Customer interface includes: name, email, company, health score, and optional `domains` array of website URLs
- Mock data sourced from `src/data/mock-customers.ts`
- Supports customers with 1 or multiple domains

### Integration Requirements
- Rendered by `CustomerSelector` container component
- Props-based data flow — no internal data fetching
- Exports `CustomerCardProps` TypeScript interface for use by parent

## Constraints

### Technical Stack and Frameworks
- Next.js 15 (App Router), React 19, TypeScript (strict mode), Tailwind CSS

### Performance Requirements
- Renders in under 16ms per card to support 60fps
- No layout shift on load

### Design Constraints
- Responsive breakpoints: mobile (320px+), tablet (768px+), desktop (1024px+)
- Maximum card width: 400px
- Minimum card height: 120px
- Spacing uses Tailwind's default scale

### File Structure and Naming Conventions
- Component: `src/components/CustomerCard.tsx`
- Props interface: `CustomerCardProps`, exported from the component file
- PascalCase for component name; camelCase for props

### Props Interface and TypeScript Definitions
```ts
interface CustomerCardProps {
  customer: {
    name: string;
    email: string;
    company: string;
    healthScore: number;
    domains?: string[];
  };
  onClick?: () => void;
}
```

### Security Considerations
- Render customer name and company as text content only (no `dangerouslySetInnerHTML`)
- No sensitive data logged to the browser console
- TypeScript strict types to prevent unexpected data shapes

## Acceptance Criteria
- [ ] Displays customer name, company, and health score correctly
- [ ] Health score badge renders red (0–30), yellow (31–70), or green (71–100)
- [ ] Shows domain list; displays count label when multiple domains are present
- [ ] Responsive layout works at 320px, 768px, and 1024px+
- [ ] `CustomerCardProps` interface is exported and used by parent component
- [ ] Passes TypeScript strict mode with no errors or warnings
- [ ] No console errors during render
- [ ] Follows project file structure and naming conventions

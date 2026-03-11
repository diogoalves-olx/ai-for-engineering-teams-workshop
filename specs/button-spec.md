# Feature: Button Component

## Context
- Reusable button component for the Customer Intelligence Dashboard
- Used throughout the dashboard for primary actions (form submissions, navigation triggers, destructive actions)
- Part of the design system to ensure consistent interaction patterns across all views
- Consumed by business analysts and operators interacting with dashboard controls

## Requirements

### Functional Requirements
- Accept `label`, `onClick`, and `variant` props
- Support three variants: `primary`, `secondary`, `danger`
- Include a loading state that disables interaction and displays a spinner
- Emit `onClick` callback when clicked (disabled during loading)
- Support optional `disabled` prop to prevent interaction independently of loading state

### User Interface Requirements
- Variant visual styles:
  - `primary`: solid blue background, white text — main call-to-action
  - `secondary`: outlined/ghost style, muted text — secondary actions
  - `danger`: solid red background, white text — destructive actions
- Loading state: replace label with an inline spinner; button remains same size
- Disabled state: reduced opacity, `not-allowed` cursor, no hover effects
- Hover and focus states for all non-disabled variants
- Visible focus ring for keyboard navigation

### Accessibility Requirements
- `aria-label` prop to override visible label for screen readers when needed
- `aria-busy="true"` and `aria-disabled="true"` set during loading state
- `disabled` HTML attribute applied when `disabled` or `loading` is true
- Meets WCAG 2.1 AA color contrast for all variants

### Integration Requirements
- Used as a standalone UI primitive across the dashboard
- Props-based, no internal state beyond what is passed in
- Properly typed TypeScript interface exported for consumer use

## Constraints

### Technical Stack
- React 19
- TypeScript with strict mode
- Tailwind CSS for styling (no inline styles)

### Design Constraints
- Maximum width: 200px
- Consistent height across variants (no layout shift on state change)
- Spinner sized to match text height (~16px)
- Consistent padding and border-radius using Tailwind spacing scale

### File Structure and Naming
- Component file: `components/Button.tsx`
- Props interface: `ButtonProps` exported from component file
- Follow project naming conventions (PascalCase for components)

### Security Considerations
- `label` rendered as text content only (no `dangerouslySetInnerHTML`)
- `onClick` typed as `() => void` to prevent unintended event propagation

## Acceptance Criteria

- [ ] Renders correctly for all three variants: `primary`, `secondary`, `danger`
- [ ] `label` prop displays as button text
- [ ] `onClick` fires when button is clicked and not loading/disabled
- [ ] Loading state shows spinner, hides label, and prevents click
- [ ] `aria-busy` is `true` during loading state
- [ ] `disabled` prop prevents click and applies disabled styling
- [ ] `aria-label` prop overrides accessible name when provided
- [ ] Maximum width does not exceed 200px
- [ ] No layout shift between default and loading states
- [ ] `ButtonProps` TypeScript interface is exported from component file
- [ ] Passes TypeScript strict mode checks
- [ ] No console errors or warnings
- [ ] Follows project code style and conventions

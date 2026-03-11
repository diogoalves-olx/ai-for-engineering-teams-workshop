Generate a spec for the component named: $ARGUMENTS

## Instructions

1. **Determine the component name** from the argument (e.g., "CustomerCard" → file slug "customer-card").
   - Convert PascalCase or camelCase to kebab-case for file lookups (e.g., "CustomerCard" → "customer-card", "healthScoreCalculator" → "health-score-calculator")

2. **Read the requirements file** at `requirements/[component-slug].md` if it exists.
   - If not found, also check for any closely-named requirements files that may match.
   - Note any requirements found (or note that none exist).

3. **Read the spec template** at `templates/spec-template.md`.

4. **Generate a comprehensive spec** following the template structure with these sections:
   - **Context**: Purpose and role in the application, how it fits the larger system, who will use it and when
   - **Requirements**: Functional requirements, UI requirements, data requirements, integration requirements — drawing from the requirements file if available
   - **Constraints**: Technical stack (Next.js 15, React 19, TypeScript, Tailwind CSS), performance requirements, design constraints, file structure, TypeScript props interface, security considerations
   - **Acceptance Criteria**: Checkboxes covering testable success criteria, edge cases, UX validation, and integration points

5. **Save the spec** to `specs/[component-slug]-spec.md`.

6. Confirm the file was saved and summarize what was generated.

Implement the component described in the spec file: $ARGUMENTS

## Instructions

1. **Read the spec file** provided as the argument (e.g., `specs/customer-card-spec.md`).
   - Strip any leading `@` from the path if present.
   - Extract the component name from the spec (look for the `## Feature:` heading).

2. **Explore the codebase** to understand conventions:
   - Read existing components in `src/components/` to match patterns, naming, and style.
   - Check `src/` for any shared types, utilities, or hooks that should be reused.
   - Note the TypeScript props interface defined in the spec's Constraints section.

3. **Implement the component** at `src/components/[ComponentName].tsx`:
   - Follow all Requirements from the spec exactly.
   - Respect all Constraints (Next.js 15, React 19, TypeScript, Tailwind CSS).
   - Define the TypeScript props interface as specified.
   - Use existing project patterns (imports, exports, file structure).

4. **Verify against Acceptance Criteria**:
   - Go through each `- [ ]` item in the spec's Acceptance Criteria section.
   - For each criterion, confirm it is satisfied by the implementation.
   - List any criteria that are NOT met.

5. **Iteratively refine** if any criteria are unmet:
   - Fix the implementation to address each failing criterion.
   - Re-verify after each fix.
   - Repeat until all criteria are satisfied.

6. **Report results**:
   - Confirm the file path where the component was saved.
   - Show the final acceptance criteria checklist with all items marked `- [x]`.
   - Note any assumptions made or trade-offs taken.

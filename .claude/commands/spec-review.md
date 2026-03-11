Review the spec file at: $ARGUMENTS

## Instructions

1. **Read the spec file** at the provided path (strip any leading `@` if present).

2. **Read the template** at `templates/spec-template.md` to understand required structure.

3. **Validate each required section** — check for presence AND completeness:

   **Context**
   - [ ] States the component's purpose and role in the application
   - [ ] Explains how it fits into the larger system
   - [ ] Identifies who will use it and when

   **Requirements**
   - [ ] Functional requirements listed (what it must do)
   - [ ] User interface requirements described
   - [ ] Data requirements specified
   - [ ] Integration requirements identified

   **Constraints**
   - [ ] Tech stack confirmed (Next.js 15, React 19, TypeScript, Tailwind CSS)
   - [ ] Performance requirements stated (load times, rendering thresholds)
   - [ ] Design constraints defined (responsive breakpoints, size limits)
   - [ ] File structure and naming conventions specified
   - [ ] TypeScript props interface defined
   - [ ] Security considerations addressed

   **Acceptance Criteria**
   - [ ] At least 3 testable success criteria with `- [ ]` checkboxes
   - [ ] Edge cases covered
   - [ ] UX validation criteria included
   - [ ] Integration points verified

4. **Flag incomplete sections** — a section is incomplete if it:
   - Is present but contains only placeholder text (e.g., "TBD", "TODO", "[describe here]")
   - Is missing sub-items that the template requires
   - Is vague enough that an engineer could not implement from it

5. **Return a validation summary** in this format:

```
## Spec Review: [spec filename]

### Overall: [PASS|NEEDS WORK|FAIL]

| Section              | Status  | Notes |
|----------------------|---------|-------|
| Context              | ✅/⚠️/❌ | ...   |
| Requirements         | ✅/⚠️/❌ | ...   |
| Constraints          | ✅/⚠️/❌ | ...   |
| Acceptance Criteria  | ✅/⚠️/❌ | ...   |

### Issues & Recommendations
[For each ⚠️ or ❌ item, provide a specific, actionable suggestion]

### Ready to implement?
[Yes | No — reason]
```

   - ✅ = present and complete
   - ⚠️ = present but incomplete or vague
   - ❌ = missing entirely

Verify the component at: $ARGUMENTS

## Instructions

1. **Read the component file** at the provided path (strip any leading `@` if present).
   - Identify the component name, props interface, and all imports.
   - Note any external dependencies, hooks, or sub-components used.

2. **TypeScript type verification**:
   - Run `npx tsc --noEmit` and capture any errors.
   - Check that the props interface is fully typed (no `any`, no missing types).
   - Verify all imported types exist and are used correctly.
   - Verify return type is valid JSX.
   - Report each type error with file and line number.

3. **Mock data compatibility check** using `src/data/mock-customers.ts`:
   - Read `src/data/mock-customers.ts` to understand the data shape.
   - Confirm the component's props interface is compatible with the mock data structure.
   - Identify any fields the component uses that are missing or mistyped in the mock data.
   - Identify any required props that would not be satisfiable with the mock data.

4. **Responsive design audit**:
   - Read the component's Tailwind classes.
   - Verify breakpoint coverage at each standard breakpoint:
     - **Mobile** (< 640px `sm`): single column, touch-friendly targets, no overflow
     - **Tablet** (640px–1024px `md`/`lg`): appropriate column count, readable layout
     - **Desktop** (> 1024px `xl`/`2xl`): full layout, spacing, grid utilization
   - Flag any missing responsive classes (e.g., hardcoded widths with no breakpoint variants).
   - Flag any potential overflow or truncation issues.

5. **Compile results** into a pass/fail summary:

```
## Verification Report: [ComponentName]

### TypeScript  [PASS|FAIL]
- [ ] No type errors from tsc
- [ ] No `any` types
- [ ] All imports resolve
- [ ] Props fully typed

### Mock Data Compatibility  [PASS|FAIL]
- [ ] Props interface matches mock-customers.ts shape
- [ ] All required props satisfiable
- [ ] No missing fields

### Responsive Design  [PASS|FAIL]
- [ ] Mobile (< 640px)
- [ ] Tablet (640px–1024px)
- [ ] Desktop (> 1024px)

### Issues Found
[List each specific issue with file:line or description]
```

6. If any checks fail, suggest concrete fixes for each issue.

# Global Stability & Bug Prevention Policy

This project is a production-grade ERP. Stability is more important than implementation speed.

## Primary Objective

Every code change MUST improve or preserve the stability of the entire application.

The project must never be left in a partially broken state.

---

# Before Any Implementation

Before writing code, the agent MUST:

- Understand the existing architecture.
- Identify dependencies affected by the change.
- Search for existing implementations to avoid duplication.
- Reuse existing components, utilities, services, and types whenever possible.
- Verify that the planned implementation does not conflict with existing functionality.

If conflicts are detected, resolve them before adding new code.

---

# During Implementation

The agent MUST:

- Follow existing project conventions.
- Avoid introducing breaking changes.
- Keep backward compatibility whenever possible.
- Maintain strict TypeScript typing.
- Avoid duplicate business logic.
- Avoid duplicate database queries.
- Avoid unnecessary dependencies.
- Keep functions small and maintainable.

Every new feature must integrate cleanly with the existing codebase.

---

# Error Prevention

Before considering a task complete, the agent MUST verify that there are:

- No TypeScript errors.
- No ESLint errors.
- No build errors.
- No runtime errors.
- No hydration errors.
- No React warnings.
- No Prisma schema errors.
- No database migration conflicts.
- No import/export errors.
- No circular dependencies.
- No unused variables.
- No unreachable code.
- No duplicate code.
- No broken routes.
- No broken API endpoints.
- No broken Server Actions.
- No broken UI components.
- No console errors.
- No failed network requests.

Zero known errors is the required standard.

---

# Existing Bug Resolution

If existing errors or bugs are discovered anywhere in the project, the agent MUST:

1. Identify the root cause.
2. Fix the issue completely.
3. Verify that the fix does not introduce regressions.
4. Update all affected files.
5. Retest the affected functionality.

The agent must not ignore existing issues simply because they are unrelated to the current task if they prevent the project from building or functioning correctly.

---

# Build Verification

After every implementation, the agent MUST ensure that the project:

- Builds successfully.
- Starts successfully.
- Runs without runtime exceptions.
- Passes type checking.
- Passes linting.
- Passes all available tests.

A feature is not complete until these checks succeed.

---

# Regression Prevention

Before finalizing any task, verify that previously working features continue to function, including:

- Authentication
- Dashboard
- Navigation
- Forms
- Database operations
- CRUD functionality
- Reports
- Charts
- API endpoints
- Role-based permissions

New features must never break existing functionality.

---

# Code Quality

The agent MUST:

- Remove dead code.
- Remove duplicate code.
- Remove unused imports.
- Remove unused variables.
- Remove obsolete files.
- Simplify overly complex logic.
- Keep consistent formatting.
- Follow the project's folder structure.

Always leave the codebase cleaner than before.

---

# Continuous Quality Gate

Every new implementation must satisfy the following checklist before completion:

- Project builds successfully.
- No TypeScript errors.
- No ESLint errors.
- No runtime errors.
- No console warnings caused by the new implementation.
- No broken UI.
- No broken database queries.
- No performance regressions.
- No security regressions.
- No accessibility regressions.

If any issue is detected, fix it before marking the task as complete.

---

# Before Writing Code

The agent must:

- Understand the existing implementation.
- Search for reusable code before creating new code.
- Identify affected modules and dependencies.
- Avoid duplicate functionality.
- Preserve existing architecture.

If an existing solution can be extended, do not create a second implementation.

---

# During Development

The agent must:

- Follow project conventions.
- Keep changes isolated to the relevant feature.
- Avoid breaking public interfaces unless explicitly requested.
- Preserve backward compatibility where practical.
- Keep business logic out of UI components.
- Maintain strict TypeScript typing.
- Handle expected errors gracefully.

---

# After Every Change

The agent must verify that:

- The project builds successfully.
- The application starts successfully.
- The affected feature works correctly.
- Existing features continue to work.
- No new warnings or errors were introduced.

If any issue is found, fix it before continuing.

---



# Root Cause Fixes

Do not apply temporary workarounds.

When fixing a bug:

1. Identify the root cause.
2. Implement a proper solution.
3. Verify the fix.
4. Check for similar issues elsewhere in the codebase.

---



# Error Handling

Do not silently ignore errors.

Use:

- Proper validation
- Clear error messages
- Safe database transactions
- Graceful failure handling
- Logging where appropriate

---

# Database Safety

Before modifying the database:

- Validate Prisma schema.
- Verify relationships.
- Protect data integrity.
- Use transactions for related operations.
- Avoid destructive migrations unless explicitly approved.

---

# Testing

After implementation, verify:

- Type checking passes.
- Linting passes.
- Build succeeds.
- Critical user flows still work.
- Database operations succeed.
- New functionality behaves as expected.

---

# Completion Criteria

A task is considered complete only when:

- The requested feature is fully implemented.
- The application builds successfully.
- All detected errors have been resolved.
- No new bugs have been introduced.
- Existing functionality continues to work correctly.
- The codebase remains stable, maintainable, and production-ready.

Never leave known errors unresolved. If a new implementation introduces any issue, the agent must identify, fix, and verify the resolution before proceeding.

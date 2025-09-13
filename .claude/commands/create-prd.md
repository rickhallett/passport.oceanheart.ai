# create-prd

Create a Product Requirements Document (PRD) for a feature or component with phase-based organization

## Usage

```
create-prd <feature-name> <description>
```

## Arguments

- `feature-name`: The name of the feature/component (lowercase, hyphens only, e.g., `user-auth`)
- `description`: Brief description of what needs to be documented

## Process

1. Analyze the current implementation of the feature/component if it exists
2. Identify problems, requirements, and design specifications
3. Create a comprehensive PRD document
4. Save to `docs/specs/` directory with filename format: `<feature-name>.prd.md` (lowercase, hyphens only)

Filename examples: `user-auth.prd.md`, `navigation-menu.prd.md`, `auth-removal.prd.md`

## PRD Structure

The PRD should include:

1. **Executive Summary** - Brief overview of the feature
2. **Problem Statement** - Current issues and pain points
3. **Requirements** - Functional and technical specifications
   - User requirements
   - Technical requirements
   - Design requirements
4. **Implementation Phases** - Logical organization (no timeline estimates)
   - Phase 1: Core functionality
   - Phase 2: ...etc
5. **Implementation Notes** - Code examples and technical approach
6. **Security Considerations** - Authentication, authorization, data validation only (if applicable)
7. **Success Metrics** - How to measure success (if applicable; do not make stuff up)
8. **Future Enhancements** - Potential improvements

## Anti-Over-Engineering Guidelines
- Specify minimum viable requirements only
- Avoid premature optimization requirements
- Use existing patterns and components where possible
- Don't specify features beyond core needs
- Prefer simple, maintainable solutions

## Examples

```
create-prd navigation-menu "Update navigation menu with mobile hamburger"
```
Creates: `docs/specs/navigation-menu.prd.md`

```
create-prd user-auth "Design user authentication flow"
```
Creates: `docs/specs/user-auth.prd.md`

## File Naming Convention

- Use lowercase with hyphens only (kebab-case)
- Always end with `.prd.md`
- Place in `docs/specs/` directory
- Conform to existing directory naming conventions
- Examples:
  - `feed-design.prd.md`
  - `navigation-update.prd.md`
  - `auth-flow.prd.md`
  - `supabase-auth-removal.prd.md`

## Notes

- Include visual mockups using ASCII diagrams where helpful
- Add code snippets for implementation guidance
- Consider mobile-first design approach
- Document critical edge cases and error states only
- **NO timeline estimates** - use phases only
- Focus on minimum viable requirements
- Only specify critical security considerations
- Include date in the document (version numbers are optional)

## UI/UX PRD Preset — Terminal Auth Views

Use this when the feature concerns the terminal-style authentication UI. Include the following in the PRD’s Problem Statement, Requirements, and Acceptance Criteria.

### Known Issues to Address
- Duplicated success/error messages: global status banner and in-window alert render simultaneously; nested `.terminal-success`/`.terminal-error` elements produce repeated labels ("SUCCESS:" twice).
- Insufficient window padding: terminal window hugs viewport edges on large screens; content feels cramped.
- Vertical alignment: window should center on tall viewports but start at top and scroll when content exceeds the viewport.

### Requirements (add to PRD)
- Single-source flash rendering: exactly one message per type (`notice`, `alert`, `error`) visible at a time. Consolidate duplicates into one component.
- Message component contract:
  - Container classes: `.terminal-success`, `.terminal-error` apply the labeled prefix via CSS `::before`.
  - Icon classes must not inherit labels. Use `.terminal-icon--success`/`--error` for glyphs instead of nesting `.terminal-success` inside another `.terminal-success`.
- Layout spacing: terminal page gets balanced padding (`padding-top`/`bottom` ≥ 48px on md+; ≥ 24px on sm). Terminal window keeps horizontal margin (`16–24px`).
- Vertical alignment: center via flex when content height ≤ viewport; otherwise top-align with natural scroll. No content cropping.
- Scope of status: the header auth status should not duplicate in-window alerts on the same route.

### Acceptance Criteria (example)
- When authenticated, dashboard shows one success message within the terminal window; no extra banner appears simultaneously.
- When unauthenticated, login shows one error message at a time.
- No view renders two visible "SUCCESS:" or "ERROR:" labels.
- On 1440×900 and larger, the window has ≥ 48px vertical padding and is visually centered; on mobile the window starts near the top with comfortable margins.

### Implementation Notes (guidance for the PRD)
- Introduce a shared flash partial (e.g., `app/views/shared/_flash.html.erb`) used by all pages; hide the header banner when page-level flash is present.
- Split CSS: keep label prefixes on the container only; create `.terminal-icon--success`/`--error` for inline icons so icons don’t trigger label `::before`.
- Adjust `.terminal-page` to `min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 48px 16px;` with responsive reductions on small screens.

Example usage:
```
create-prd auth-ui-polish "Fix duplicated messages, padding, vertical alignment"
```

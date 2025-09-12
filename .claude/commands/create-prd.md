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
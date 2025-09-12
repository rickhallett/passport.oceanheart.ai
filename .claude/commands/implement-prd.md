# implement-prd

Implement a Product Requirements Document (PRD) using Test-Driven Development approach with phased execution and change logging

## Usage

```
implement-prd <prd-filename> [thinking-mode]
```

## Arguments

- `prd-filename`: Name of the PRD file in docs/specs/ (lowercase, hyphens only, e.g., `auth-removal`)
- `thinking-mode` (optional): 
  - `think` - Standard implementation with basic reasoning
  - `think-harder` - Enhanced analysis with deeper consideration
  - `ultrathink` - Use mcp__sequential-thinking__sequentialthinking for complex reasoning

## Process

### 1. Setup Phase
- Read the PRD from `docs/specs/<prd-filename>.prd.md`
- Create implementation report at `docs/specs/<prd-filename>-implementation-report.md`
- Create change log at `docs/specs/<prd-filename>-change-log.md`
- Initialize git status check
- Create TodoWrite list with all tasks

### 2. Task Breakdown
Extract tasks from PRD and break down into:
- Primary tasks (from main requirements)
- Subtasks (atomic, testable units)
- Dependencies between tasks
- **Phase organization** (no timeline estimates - organize by logical sequence only)

### 3. Anti-Over-Engineering Guidelines
- Implement minimum viable solution first
- Avoid premature optimization
- Use existing patterns and components where possible
- Don't add features not specified in PRD
- Prefer simple, readable code over clever solutions
- Only add abstractions when you have 3+ use cases

### 4. TDD Implementation Loop

For each task:

#### a. Pre-Implementation
```bash
git status  # Verify clean working tree
```

#### b. Test Creation (if applicable)
- Write failing test for the feature
- Run test to confirm failure
- Commit test with message: `test: add test for <feature>`

#### c. Implementation
- Implement minimal code to pass test
- Verify implementation works
- Run any existing tests

#### d. Commit Atomic Change
```bash
git add <specific-files>
git commit -m "<type>: <description>"
```

Commit message types:
- `feat:` New feature
- `fix:` Bug fix
- `style:` Formatting, missing semicolons, etc.
- `refactor:` Code restructuring
- `test:` Adding tests
- `docs:` Documentation only
- `chore:` Maintenance

#### e. Verify & Document
- Run `git status` to confirm clean staging
- Update change log with specific file changes and rationale
- Update report with task completion
- Mark task as completed in TodoWrite

### 5. Task Order

1. **Setup & Configuration**
   - Dependencies installation
   - Configuration updates
   - Type definitions

2. **Core Functionality**
   - Data structures
   - Business logic
   - API integrations

3. **UI Components**
   - Layout changes
   - Visual components
   - Animations

4. **Testing & Validation**
   - Unit tests
   - Integration tests
   - Manual verification

5. **Documentation**
   - Code comments (only when complex logic requires explanation)
   - README updates (if public API changes)
   - update ARCHITECTURE.md (invoke .claude/commands/architect.md)
   - Report and change log finalization

### 6. Report Structure

The implementation report should include:

```markdown
# Implementation Report: <Feature Name>
## Date: <Current Date>
## PRD: <prd-filename>.prd.md

## Phases Completed
- [x] Phase 1: Setup & Configuration
  - Tasks: <brief-list>
  - Commits: <commit-range>
- [x] Phase 2: Core Implementation
  - Tasks: <brief-list>
  - Commits: <commit-range>

## Testing Summary
- Tests written: <count>
- Tests passing: <count>
- Manual verification: <status>

## Challenges & Solutions
- Challenge 1: Description
  - Solution: How it was resolved

## Critical Security Notes
- Authentication/Authorization changes: <details>
- Data validation changes: <details>
- Input sanitization: <details>

## Next Steps
- Future enhancements
- Technical debt identified
```

### 7. Change Log Structure

```markdown
# Change Log: <Feature Name>
## Date: <Current Date>

## Files Modified

### <filename>
- **Change**: <brief-description>
- **Rationale**: <why-this-change>
- **Impact**: <what-this-affects>
- **Commit**: <hash>

### <filename>
- **Change**: <brief-description>
- **Rationale**: <why-this-change>
- **Impact**: <what-this-affects>
- **Commit**: <hash>

## Dependencies Added/Removed
- Added: <package>@<version> - <reason>
- Removed: <package> - <reason>

## Breaking Changes
- <description-of-breaking-change>
- Migration required: <yes/no>
```

## Thinking Modes

### Standard (`think`)
- Analyze requirements
- Plan implementation
- Execute tasks sequentially

### Enhanced (`think-harder`)
- Deep analysis of edge cases
- Consider multiple implementation approaches
- Optimize for performance and maintainability

### Ultra (`ultrathink`)
When available, use sequential thinking MCP:
```javascript
mcp__sequential-thinking__sequentialthinking({
  thought: "Analyzing PRD requirements...",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 10
})
```

## Example Workflow

```bash
# Start implementation
implement-prd feed-design ultrathink

# Agent actions:
1. Read docs/specs/feed-design.prd.md
2. Create docs/specs/feed-design-implementation-report.md
3. Create docs/specs/feed-design-change-log.md
4. Break down into phases:
   - Phase 1: Core functionality (no timeline estimates)
     - Subtask 1.1: Add JavaScript calculation
     - Subtask 1.2: Update HTML structure
   - Phase 2: Visual improvements
     - Subtask 2.1: Update grid system
     - Subtask 2.2: Adjust responsive breakpoints
5. For each subtask:
   - Implement minimal viable solution
   - Test functionality
   - Log change with rationale
   - Commit with message
   - Verify staging clean
6. Update report and change log
```

## Git Commit Guidelines

### Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Examples
```bash
feat(feed): add dynamic countdown timer to September 15

Replaces static "NOW" text with calculated days remaining.
Updates daily at midnight local time.

feat(feed): update member counter to match countdown width

Removes full-width behavior and aligns with grid system.

style(feed): equalize statistics block widths

Updates grid layout for consistent visual hierarchy.
```

## Verification Checklist

Before marking task complete:
- [ ] Code follows PRD specifications exactly (no extra features)
- [ ] Tests pass (if applicable)
- [ ] No linting errors
- [ ] Git staging area is clean
- [ ] Commit message follows conventions
- [ ] Change log updated with file changes and rationale
- [ ] Report updated with task details
- [ ] Security considerations documented (if applicable)

## Error Handling

If implementation fails:
1. Document error in report
2. Attempt alternative approach
3. If blocked, note in report and continue with next task
4. Create TODO for resolution

## Notes

- Always verify git status before and after commits
- Keep commits atomic and focused
- Document any deviations from PRD in report
- Use thinking mode appropriate to complexity
- Test each change before committing
- Update TodoWrite list throughout process
- **NO timeline estimates** - organize by phases only
- Focus on minimum viable implementation
- Maintain detailed change log for code review
- Only implement critical security measures specified in PRD
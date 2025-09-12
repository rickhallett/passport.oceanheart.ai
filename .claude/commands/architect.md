# architect

Generate or update the project's ARCHITECTURE.md file with comprehensive architectural documentation

## Usage

```
architect [update-reason]
```

## Arguments

- `update-reason` (optional): Brief description of why architecture is being updated (e.g., "added news collection", "refactored feed components")

## Process

### 1. Analysis Phase
- Scan entire codebase structure
- Identify key directories and their purposes
- Map component relationships
- Document data flows
- Identify external dependencies

### 2. Documentation Generation
Creates or updates `/ARCHITECTURE.md` with three levels of detail:
- **High-level**: System overview and core concepts
- **Medium-level**: Component interactions and data flows
- **Low-level**: Implementation specifics and code patterns

### 3. Update Tracking
- Preserves revision history section
- Adds entry for current update with timestamp
- Notes significant changes if updating existing file

## ARCHITECTURE.md Structure

```markdown
# Project Architecture

## Last Updated: <timestamp>
## Version: <version>

## 1. High-Level Overview

### 1.1 System Purpose
Brief description of what the application does

### 1.2 Core Technologies
- Framework: (e.g., Astro)
- Styling: (e.g., CSS-in-JS, Tailwind)
- Data: (e.g., Content Collections, APIs)
- Build: (e.g., Vite, Webpack)

### 1.3 Architecture Pattern
- Pattern type (e.g., Component-based, MVC)
- Key architectural decisions
- Design principles followed

## 2. Medium-Level Architecture

### 2.1 Directory Structure
```
project-root/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages
│   ├── layouts/        # Page layouts
│   ├── content/        # Content collections
│   └── styles/         # Global styles
├── public/             # Static assets
├── specs/              # PRDs and reports
└── .claude/            # Claude commands
```

### 2.2 Component Hierarchy
- Layout components
- Page components
- Shared components
- Utility components

### 2.3 Data Flow
- Content sourcing
- State management
- API interactions
- Build-time vs runtime data

### 2.4 Routing Strategy
- Static vs dynamic routes
- Route parameters
- Navigation patterns

## 3. Low-Level Implementation Details

### 3.1 Component Patterns

#### Component Structure
```astro
---
// Frontmatter: Data fetching and logic
---
<!-- Template: HTML structure -->
<style>/* Scoped styles */</style>
<script>/* Client-side behavior */</script>
```

### 3.2 Naming Conventions
- Files: PascalCase for components, kebab-case for pages
- CSS: BEM methodology or utility classes
- JavaScript: camelCase for functions, UPPER_CASE for constants

### 3.3 Key Components

#### Layout.astro
- Purpose: Main page wrapper
- Props: title, description, ogImage
- Children: Page content

#### BrutalSection.astro
- Purpose: Consistent brutal design container
- Props: title, background
- Usage: Wraps content sections

### 3.4 Content Collections

#### Schema Definitions
- news: { date, title, published }
- feed: { username, location, timestamp, comment, published }
- leads: { name, email, visitor_type, etc. }

### 3.5 Styling Architecture
- CSS Variables for theming
- Component-scoped styles
- Global utility classes
- Responsive breakpoints

### 3.6 Build Pipeline
- Development: npm run dev
- Production: npm run build
- Preview: npm run preview

## 4. External Integrations

### 4.1 Third-party Services
- Analytics
- CMS (if applicable)
- APIs

### 4.2 Dependencies
Critical npm packages and their purposes

## 5. Performance Considerations

### 5.1 Optimization Strategies
- Image optimization
- Code splitting
- Lazy loading
- Caching strategies

### 5.2 Bundle Size
- Current size metrics
- Optimization opportunities

## 6. Security Considerations

### 6.1 Data Handling
- Input validation
- XSS prevention
- CSRF protection

### 6.2 Environment Variables
- Required variables
- Security best practices

## 7. Development Workflow

### 7.1 Local Development
Setup and running instructions

### 7.2 Testing Strategy
- Unit tests
- Integration tests
- E2E tests

### 7.3 Deployment
- Build process
- Hosting platform
- CI/CD pipeline

## 8. Maintenance & Evolution

### 8.1 Technical Debt
Known issues and planned improvements

### 8.2 Scalability Considerations
How the architecture supports growth

### 8.3 Migration Paths
Potential future architectural changes

## 9. Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| <date> | <version> | <changes> | <agent/user> |
```

## Implementation Guidelines

### When to Run
- After implementing new features
- After refactoring existing code
- When onboarding new team members
- Before major architectural decisions
- As part of implement-prd completion

### Analysis Scope
The command should analyze:
- All source files in src/
- Configuration files (astro.config.*, package.json, etc.)
- Content structure and schemas
- Public assets organization
- Build outputs

### Code Inspection
For each major component/module:
1. Identify purpose and responsibilities
2. Document inputs/outputs
3. Note dependencies
4. Highlight patterns used

### Pattern Recognition
Identify and document:
- Repeated code patterns
- Naming conventions
- File organization patterns
- Common utilities
- Shared styles

## Example Usage

```bash
# Initial architecture documentation
architect

# After feature implementation
architect "implemented dynamic countdown timer"

# After refactoring
architect "refactored component structure for better reusability"
```

## Output Behavior

### Creating New File
- Performs comprehensive analysis
- Documents all architectural aspects
- Establishes baseline for future updates

### Updating Existing File
- Preserves revision history
- Updates changed sections
- Adds new components/features
- Marks deprecated items
- Updates timestamp and version

## Quality Checks

Before finalizing:
- [ ] All major directories documented
- [ ] Component relationships clear
- [ ] Data flows explained
- [ ] Build process documented
- [ ] Dependencies listed
- [ ] Naming conventions specified
- [ ] Recent changes reflected
- [ ] No outdated information

## Notes

- Keep descriptions concise but comprehensive
- Use diagrams where helpful (ASCII or Mermaid)
- Focus on "why" not just "what"
- Document architectural decisions and trade-offs
- Include both current state and planned improvements
- Make it useful for both new and existing team members
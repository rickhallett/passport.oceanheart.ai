# Change Log: Auth UI Polish

Date: 2025-09-12

## Files Modified

### app/assets/stylesheets/terminal.css
- Change: Added `.terminal-icon` utilities and updated `.terminal-page` layout/padding.
- Rationale: Prevent duplicated label prefixes; improve vertical padding and alignment.
- Impact: Consistent icons; better spacing and centering on md+.

### app/views/layouts/application.html.erb
- Change: Conditional render for `shared/auth_status` suppressed by `content_for` or `flash.any?`.
- Rationale: Avoid banner + in-window duplication.
- Impact: Single message visible.

### app/views/shared/_auth_status.html.erb
- Change: Replace nested `.terminal-success/.terminal-error` with icon classes.
- Rationale: Remove repeated "SUCCESS:"/"ERROR:" labels.
- Impact: Cleaner banner display.

### app/views/home/index.html.erb
- Change: Add suppression flag; replace nested message class with icon; adjust page padding/centering.
- Rationale: Single success message and improved layout.
- Impact: No duplication; better visual balance.

### app/views/sessions/new.html.erb
- Change: Add suppression flag; adjust page padding/centering.
- Rationale: Avoid header error duplication; improve spacing.
- Impact: Clear, focused login feedback.

## Dependencies Added/Removed
- None

## Breaking Changes
- None (CSS class additions are backward compatible; views updated accordingly).

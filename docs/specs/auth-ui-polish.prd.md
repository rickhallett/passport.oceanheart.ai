# PRD: Auth UI Polish

Date: 2025-09-12

## Executive Summary
Polish the terminal-style authentication UI by eliminating duplicated messages, improving window padding, and refining vertical alignment for readable, consistent screens across devices.

## Problem Statement
- Success/error messages are duplicated (global banner and in-window; nested containers trigger repeated labels like "SUCCESS:" twice).
- Insufficient vertical padding; content feels cramped near viewport edges.
- Vertical alignment should center on tall viewports but start at top when content exceeds the viewport.

## Requirements
- One visible message per type at a time; prefer page-level flash or in-window status over the global banner.
- Message containers (`.terminal-success`, `.terminal-error`) provide labeled prefixes via `::before`. Inline icons must not inherit labels; use `.terminal-icon--success`/`--error`.
- Add responsive page padding: ≥ 48px vertical on md+, ≥ 24px on small.
- Vertical alignment: top-align by default; center on md+ when content fits. No cropping.
- Keep styles retro-terminal: green/black, thin borders, subtle glow.

## Implementation Phases
- Phase 1: Structure & CSS
  - Add icon classes; adjust `.terminal-page` layout and padding.
- Phase 2: Views & Layout
  - Suppress global banner when page-level messaging exists; remove nested message classes; add suppression flags in views.
- Phase 3: Verification
  - Manual checks on sign-in, dashboard; confirm a single message and correct spacing at common breakpoints.

## Implementation Notes
- Layout conditional: render `shared/auth_status` unless `content_for?(:suppress_auth_status)` or `flash.any?`.
- Views: replace nested `.terminal-success/.terminal-error` with `.terminal-icon--success/--error`.
- CSS: add `.terminal-icon` utilities; update `.terminal-page` with flex + responsive padding.

## Success Metrics
- No page shows duplicated label prefixes or both banner and in-window messages at the same time.
- Terminal window visually centered on md+ when content is short; top-aligned with scroll when content is long.

## Future Enhancements
- Dismissible banner component with Turbo Stream updates.
- Integration tests for flash rendering precedence.

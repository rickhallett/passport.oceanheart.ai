# PRD: Phase 7 — Centralized Error Reporting

Date: 2025-09-13

## Executive Summary
Integrate a hosted error tracker (Sentry or Honeybadger) to capture exceptions with rich context (request, user, release), enabling alerting, deduplication, and faster incident resolution.

## Problem Statement
- Exceptions are only visible in logs; no alerts or aggregation.
- Missing request/user/breadcrumb context makes triage slow.

## Requirements
- Add error tracking client with DSN from ENV. Environments: development, staging, production.
- Automatically capture unhandled exceptions in controllers, jobs, and background tasks.
- Context: request_id, user_id/email (if present), params whitelist, headers subset, env, release (git sha).
- Breadcrumbs: auth events, external HTTP calls, DB retries.
- Filtering: respect Rails parameter filtering; scrub cookies/tokens/passwords/PII.
- Sampling: 100% dev/staging; configurable in prod via ENV (e.g., 10–50%).
- Alerting: route new issues and regressions to email/Slack (config-only).

## Implementation Phases
1) Client Setup
   - Add gem and initializer (`Sentry.init do |c| ... end`), load DSN from ENV; set release to git sha.
2) Rails Integration
   - Enable Rails/ActiveJob integrations; add `before_action` to set user context when signed in.
3) Breadcrumbs
   - Emit breadcrumbs for session events and external calls via small helpers.
4) Filtering & Sampling
   - Extend parameter filters; add sample rate env vars.
5) Verification & Docs
   - Force a sample exception in staging; verify it includes request_id and user context; document runbook.

## Implementation Notes
```ruby
# config/initializers/sentry.rb
Sentry.init do |c|
  c.dsn = ENV['SENTRY_DSN']
  c.breadcrumbs_logger = [:active_support_logger]
  c.enabled_environments = %w[development staging production]
  c.traces_sample_rate = ENV.fetch('SENTRY_TRACES_SAMPLE_RATE', 0.1).to_f
  c.environment = Rails.env
  c.release = ENV['GIT_SHA']
end

# app/controllers/application_controller.rb
before_action do
  Sentry.set_user(id: Current.user_id) if defined?(Sentry)
end
```

## Success Metrics
- A raised exception in staging appears in the tracker within 30s with user and request context.
- Duplicate errors are deduplicated; regressions reopen issues/alerts.

## Future Enhancements
- Link errors to logs/metrics via request_id and trace_id; add performance spans later.

# PRD: Phase 5 — Structured Logging

Date: 2025-09-13

## Executive Summary
Introduce structured, privacy-safe JSON logging with consistent request, job, and external-call context so production issues can be traced quickly across services and subdomains.

## Problem Statement
- Logs are unstructured and inconsistent across controllers/jobs; difficult to correlate events.
- Missing request/user context and durations hinder incident triage.

## Requirements
- JSON logs (single-line) with fields: ts, level, env, service, request_id, user_id (optional), ip, method, path, status, duration_ms, controller, action, params_whitelist, ua, referrer, error_class, error_message.
- Job logs: job_class, jid, queue, attempts, duration_ms, error_* when failures occur.
- External calls: name, url/host, duration_ms, status/error.
- Dev: pretty logs toggle via ENV (`LOG_PRETTY=true`). Prod: always JSON to STDOUT.
- Privacy: filter secrets/credentials/password/email domains by Rails filters; never log raw tokens.
- Health noise: suppress `/up` and `/metrics` to DEBUG.

## Implementation Phases (no timelines)
1) Formatter & Config
   - Add JSON formatter (custom `ActiveSupport::Logger` formatter or `lograge` if allowed) and tag defaults (service, env).
2) HTTP Request Lifecycle
   - Subscribe to `process_action.action_controller` and emit a single JSON event per request.
   - Ensure `request_id` middleware is present; add `Current.user_id` tagging.
3) Jobs & External Calls
   - Wrap jobs (Active Job/SolidQueue) with around hooks to emit start/finish.
   - Add a thin helper to time Net::HTTP/Faraday calls.
4) Filtering & Noise Control
   - Extend `filter_parameters`; down-level `/up` and `/metrics` logs.
5) Verification & Docs
   - Manual smoke with sign-in/out; document fields and local toggles in README.

## Implementation Notes
```ruby
# config/initializers/logging.rb
Rails.application.configure do
  logger = ActiveSupport::Logger.new($stdout)
  logger.formatter = JsonLogFormatter.new(pretty: ENV["LOG_PRETTY"].present?)
  config.logger = ActiveSupport::TaggedLogging.new(logger)
end

# app/lib/json_log_formatter.rb (emit {ts, level, msg, ...})
# Use ActiveSupport::Notifications to capture process_action/action_controller events
```

## Success Metrics
- Every request and job yields exactly one JSON line with consistent fields.
- Errors include error_class and error_message with request_id.

## Future Enhancements
- Correlate cross-service logs via W3C trace headers.
- Add sampling controls for high-volume endpoints.

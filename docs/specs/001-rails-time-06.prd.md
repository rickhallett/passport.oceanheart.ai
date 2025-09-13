# PRD: Phase 6 — Metrics & /metrics Export

Date: 2025-09-13

## Executive Summary
Expose Prometheus-compatible metrics for HTTP, DB, and jobs. Define SLIs for availability and latency, and provide the basis for Grafana dashboards.

## Problem Statement
- No visibility into throughput, error rate, or latency percentiles.
- Cannot alert on regressions or capacity constraints.

## Requirements
- Prometheus exporter at `/metrics` (read-only; protect behind Basic Auth or IP allowlist in production).
- Counters: http_requests_total{method,controller,action,status}, job_executed_total{class,queue,status}.
- Histograms: http_request_duration_seconds, db_query_duration_seconds, job_duration_seconds.
- Gauges: solid_queue_enqueued, solid_queue_running (if SolidQueue used), cache_hits_total.
- Labels must be bounded (controller/action/status/queue), not raw paths or user IDs.
- Include build/release label (git sha) for correlation.

## Implementation Phases
1) Exporter Setup
   - Add `prometheus-client` (or `yabeda` + adapters) and a Rack endpoint at `/metrics`.
2) HTTP Metrics
   - Rack middleware to time each request and increment counters, labeling by method/controller/action/status.
3) DB & Cache
   - Subscribe to `sql.active_record` and record durations in a histogram; optionally count cache hits via `ActiveSupport::Notifications`.
4) Jobs
   - Around hook for Active Job/SolidQueue to measure and count job outcomes.
5) Validation & Docs
   - Verify `/metrics` outputs non-empty data; document how to scrape locally and in staging.

## Implementation Notes
```ruby
# config/initializers/metrics.rb
PROM = Prometheus::Client.registry
HTTP_COUNTER = Prometheus::Client::Counter.new(:http_requests_total, 'HTTP requests')
HTTP_HIST = Prometheus::Client::Histogram.new(:http_request_duration_seconds, 'Latency', buckets: [0.05,0.1,0.2,0.3,0.5,1,2])
PROM.register(HTTP_COUNTER); PROM.register(HTTP_HIST)

# config/routes.rb
mount ->(env) { [200, {'Content-Type'=>'text/plain'}, [Prometheus::Client::Formats::Text.marshal(PROM)]] }, at: '/metrics'
```

## Success Metrics
- `/metrics` shows counters increasing with load and latency buckets populated.
- Dashboards report request rate, error rate, and p95 latency for `HomeController#index` and `SessionsController#create`.

## Future Enhancements
- Add RED/USE dashboards; alerting rules for error rate and high latency.

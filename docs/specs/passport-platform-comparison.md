# Passport Rebuild Options — Comparative Analysis

This document summarizes the architectural options currently under consideration for reimplementing the Oceanheart Passport authentication service. Each option references a dedicated technical specification and is evaluated across the same decision criteria.

## Summary Matrix

| Option | Tech Spec | Language / Runtime | Primary Frameworks | DB Layer | Key Strengths | Primary Risks |
|--------|-----------|--------------------|--------------------|----------|---------------|---------------|
| Rails (Current) | N/A (existing) | Ruby / MRI 3.4 | Rails 8 | Active Record (Postgres) | Mature implementation, proven SSO flows, rich ecosystem | Memory footprint, slower cold starts, Ruby staffing |
| Go Passport | [TECH_SPEC](../../go-passport/TECH_SPEC.md) | Go 1.23 | net/http + custom middleware | `database/sql` + pgx | Minimal dependencies, high performance, static binaries | More bespoke framework work, limited ecosystem conveniences |
| Spring Passport | [TECH_SPEC](../../spring-passport/TECH_SPEC.md) | Java 21 | Spring Boot 3, Spring Security | Spring Data JPA | Enterprise-grade security primitives, rich tooling | Higher resource usage, complex configuration, JVM cold starts |
| Passport Bun | [TECH_SPEC](../../passport-bun/TECH_SPEC.md) | TypeScript / Bun 1.1 | Bun native server | `pg` client | Fast startup, unified JS stack, minimal footprint | Bun ecosystem maturity, manual auth primitives |
| Passport Lite (Bun + Feathers) | [TECH_SPEC](../../passport-lite/TECH_SPEC.md) | TypeScript / Bun 1.1 | Feathers 5, Express transport | Feathers Postgres (Knex) | Batteries-included auth layer, service hooks simplify CRUD | Feathers-Postgres stability, framework learning curve |
| Passport Hono (Bun + Hono) | [TECH_SPEC](../../passport-hono/TECH_SPEC.md) | TypeScript / Bun 1.1 | Hono | `postgres` client | Lightweight, edge-friendly, middleware-first design | More custom auth plumbing, rate limiter needs external store |
| Passport Elysia (Bun + Elysia) | [TECH_SPEC](../../passport-elysia/TECH_SPEC.md) | TypeScript / Bun 1.1 | Elysia | `postgres` client or Drizzle ORM | Bun-native framework with schema validation, lightweight runtime | Manual auth wiring, ecosystem still maturing |

## Evaluation Criteria

1. **Development Velocity** — effort required to reach parity with Rails feature set.  
2. **Operational Maturity** — deployability, observability, ease of scaling on Render.  
3. **Security Posture** — availability of hardened authentication primitives, battle-tested libraries.  
4. **Performance & Resource Footprint** — cold starts, concurrency handling, runtime efficiency.  
5. **Team Skill Alignment** — familiarity of engineering team with chosen stack.  
6. **Ecosystem & Tooling** — availability of supporting libraries, diagnostics, and documentation.

## Option Deep Dive

### Rails (Status Quo)
- **Pros**: Feature complete, existing investment, batteries-included admin & tooling, close alignment with docs/tests.  
- **Cons**: Highest memory footprint on Render free tier, Ruby talent pool limited internally, scaling to multiple workers expensive.  
- **Risks**: Continued maintenance burden if adopting newer runtime options; improvements may require deep Rails expertise.

### Go Passport
- **Pros**: Compiled binary, excellent concurrency, minimal runtime overhead, strong standard library.  
- **Cons**: Requires building routing, CSRF, session, and template layers manually; steeper ramp-up for UI parity.  
- **Operational Notes**: Ideal for containerized deployment; needs Redis (or Cloudflare) later for distributed rate limiting.  
- **Security**: Leans on handwritten JWT/CSRF logic—needs comprehensive tests.

### Spring Passport
- **Pros**: Spring Security provides robust auth/authorization, testable architecture, declarative configuration.  
- **Cons**: JVM warm-up and memory usage; configuration churn between environments.  
- **Operational Notes**: Flyway migrations + Actuator endpoints simplify ops; bundling requires JDK toolchain.  
- **Security**: Mature cryptography, well-documented best practices.

### Passport Bun (Minimal Bun)
- **Pros**: Fast startup, unified JS full-stack story, low dependency footprint, Bun test runner.  
- **Cons**: Ecosystem still maturing; manual implementation of auth middleware, CSRF, sessions.  
- **Operational Notes**: Works well on Render with container; rate limiting single-instance only unless augmented.  
- **Security**: Must implement JWT/CSRF carefully; rely on tests and potential future `jose` adoption.

### Passport Lite (Bun + Feathers)
- **Pros**: Feathers services provide CRUD scaffolding, built-in auth flows, hooks system for validation.  
- **Cons**: Postgres adapter stability varies; Feathers community smaller compared to Express/Nest.  
- **Operational Notes**: Knex migrations fit existing SQL workflows; session management simplified with hooks.  
- **Security**: Leverages proven Feathers auth packages; still requires CSRF middleware for server-rendered forms.

### Passport Hono (Bun + Hono)
- **Pros**: Very lightweight, edge-friendly, fine-grained middleware, works with JSX for views.  
- **Cons**: Requires hand-rolled auth/session layers; limited higher-level tooling.  
- **Operational Notes**: Minimal runtime footprint; structured logging and error handling must be added.  
- **Security**: Similar to Bun minimal—manual JWT/CSRF implementations; small attack surface if done correctly.

### Passport Elysia (Bun + Elysia)
- **Pros**: Elysia provides first-class TypeScript typings, plugin ecosystem (HTML, JWT) and schema validation, still lightweight like Hono.  
- **Cons**: Less turnkey auth; CSRF/rate limiting require custom middleware or third-party plugins; community smaller than Express/Spring.  
- **Operational Notes**: Bun-native tooling keeps startup fast; Drizzle or postgres.js pairs well; migrations need custom scripting.  
- **Security**: Relies on manual password hashing/JWT implementation unless using plugins—requires thorough tests and security review.

## Recommendations & Next Steps

1. **Proof of Concept**: Implement a vertical slice (sign-in + JWT cookie + admin list) for top two candidates (e.g., Go and Bun+Feathers) to benchmark developer experience.  
2. **Operational Costing**: Estimate Render or Fly.io pricing for each stack, factoring in memory/CPU needs and supporting services (Redis, tracing).  
3. **Team Survey**: Gauge engineer comfort with Go, Java, and Bun stacks to align with training requirements.  
4. **Security Review**: Engage security to review JWT/CSRF plans for non-Rails options before committing.  
5. **Decision Timeline**: Target selection by end of current sprint to unblock rewrite roadmap.

---

_Last updated: 2025-09-17_

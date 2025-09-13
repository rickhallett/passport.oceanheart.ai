# Repository Guidelines

## Project Structure & Module Organization
- Rails app (Rails 8, Postgres, Tailwind, Importmap).
- Source: `app/` (models, controllers, views, jobs), helpers in `app/helpers`.
- Config: `config/`, Rack entry `config.ru`.
- Database: `db/` (migrations, seeds).
- Tests: `test/` (unit, integration, system; fixtures in `test/fixtures`).
- Executables and scripts: `bin/` (e.g., `dev`, `setup`, `rubocop`).
- Public assets: `public/`, docs: `docs/`.
- Deployment/infra: `.kamal/`, `Dockerfile`, `render.yaml`.

## Build, Test, and Development Commands
- Install and setup: `bin/setup` (bundle, db setup).
- Run locally: `bin/dev` (foreman runs `web` and Tailwind watcher from `Procfile.dev`).
- Rails server (direct): `bin/rails server -p 3000`.
- DB tasks: `bin/rails db:prepare`, `bin/rails db:migrate`.
- Test suite: `bin/rails test` and system tests `bin/rails test:system`.
- Lint: `bin/rubocop`.
- Security scan: `bin/brakeman --no-pager`.
- JS deps audit: `bin/importmap audit`.
- Deploy (Kamal): `bin/kamal deploy` (ensure secrets set in `.kamal/secrets`).

## Coding Style & Naming Conventions
- Ruby: 2-space indentation, no semicolons, single quotes unless interpolation.
- Follow Rails conventions: `SnakeCase` files, `CamelCase` classes, RESTful controllers, singular models.
- Keep methods small; prefer POROs in `app/` or `lib/` when appropriate.
- Lint with RuboCop Omakase; fix offenses before pushing.

## Testing Guidelines
- Framework: Minitest (unit/integration/system).
- Name tests after subject, e.g., `test/models/user_test.rb`.
- Use fixtures in `test/fixtures/*.yml`.
- Run `bin/rails db:test:prepare` if schema changes.
- Aim to cover critical auth/session flows and any DB-backed logic.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `style:`, `config:`, etc. Scope optional (e.g., `feat(auth): ...`).
- Commits should be small and focused.
- PRs must include: clear description, linked issue (if any), testing notes, and screenshots for UI changes.
- Ensure CI passes: lint, security scans, and tests.

## Security & Configuration Tips
- Use `.env.development`/`.env.production` for secrets; never commit credentials. Keep `config/master.key` safe.
- Required services: PostgreSQL (DATABASE_URL) and optionally Redis for queue/cable.
- Review `.kamal/secrets` for how secrets are sourced; do not hardcode.

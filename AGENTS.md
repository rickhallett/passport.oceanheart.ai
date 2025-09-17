# Repository Guidelines

## Project Structure & Module Organization
Rails 8 app lives under `app/`, with models, controllers, views, jobs, and helpers in `app/helpers`. Configuration belongs in `config/`, rack entry in `config.ru`, and migrations plus seeds in `db/`. Tests reside in `test/` with fixtures in `test/fixtures`. Executables are in `bin/` (`bin/dev`, `bin/setup`, `bin/rubocop`), public assets in `public/`, and deployment scripts in `.kamal/`, `Dockerfile`, and `render.yaml`.

## Build, Test, and Development Commands
Run `bin/setup` once to install gems and prepare databases. Use `bin/dev` for local development; it boots Rails and Tailwind via `Procfile.dev`. Launch the server directly with `bin/rails server -p 3000`. Keep schemas fresh with `bin/rails db:prepare` and apply migrations via `bin/rails db:migrate`. Execute the full test suite through `bin/rails test`; add `:system` for browser tests.

## Coding Style & Naming Conventions
Follow Rails conventions: 2-space indentation, single quotes unless interpolation, and descriptive method names. Place POROs under `app/` or `lib/` when they serve domain logic. File names are snake_case; classes remain CamelCase. Run `bin/rubocop` before pushing to enforce style and catch common smell.

## Testing Guidelines
Use Minitest for unit, integration, and system coverage. Name test files after the subject, e.g., `test/models/user_test.rb`. Maintain fixtures in `test/fixtures`. After schema changes, run `bin/rails db:test:prepare` before executing `bin/rails test` or `bin/rails test:system`.

## Commit & Pull Request Guidelines
Write Conventional Commit messages such as `feat(auth): allow OAuth login` or `fix: correct invoice total`. Keep commits focused and small. Pull requests must describe the change, reference related issues, and include testing notes; attach screenshots for UI updates. Ensure CI-ready by running `bin/rubocop`, `bin/brakeman --no-pager`, and `bin/importmap audit` locally.

## Security & Configuration Tips
Store secrets in `.env.development` or `.env.production`, and protect `config/master.key`. PostgreSQL is required; Redis is optional for queues or Action Cable. Review `.kamal/secrets` before deployment and never commit credentials.

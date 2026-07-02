# Cloudflare and Neon Deployment Plan

Date: 2026-07-02

## Purpose

Deploy PermitGraph as a small hosted proof of concept without changing the scanner.

The target demo should show this loop:

1. A developer queues or runs a scan.
2. The CLI writes scan state and findings to Postgres.
3. A Cloudflare Worker serves the current run state.
4. The dashboard reads the Worker API.
5. The docs site explains what the developer is looking at.

No live Cloudflare, Neon, DNS, or paid infrastructure has been created from this plan.

## Recommendation

Use Neon Postgres for the first shared database and deploy the API on Cloudflare Workers.

Reason:

- The current Python schema is already Postgres.
- The CLI already supports `DATABASE_URL`.
- The Worker already uses `pg`.
- The migration command already exists: `agent-permit db migrate`.
- D1 is cheaper for simple SQLite workloads, but it would require schema and adapter changes before this product can use it.

Use Cloudflare Hyperdrive for the production Worker connection after the first smoke test. Hyperdrive supports existing Postgres databases and lets Workers use familiar database drivers through a pooled connection layer.

## Deployment units

| Unit | Current artifact | Target host | Notes |
| --- | --- | --- | --- |
| CLI package | `dist/agent_permit_office-0.1.0-py3-none-any.whl` and `.tar.gz` | GitHub release, PyPI later | Local scanner and runner stay client-side. |
| Worker API | `worker/` | Cloudflare Workers | Serves flat `/api/*` endpoints from Postgres. |
| Dashboard | `dashboard/dist/` | Cloudflare static assets or Pages | Static Vite app reads the Worker API. |
| Docs | `docs-site/` | Cloudflare Workers with OpenNext | Fumadocs/Next.js site with search. |
| Demo proof | `docs/demo-artifacts/public-fixture-scans/` | GitHub and docs | Public sanitized fixtures and baselines. |
| Shared state | Postgres schema in `src/agent_permit/db.py` | Neon Postgres | Stores repos, jobs, runs, findings, events, artifacts, model usage. |

## Database decision

### Use Neon now

Neon is the lowest-friction database for the current code because it is Postgres and can scale to zero when idle.

Initial local and hosted commands use the same variable:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
uv run --extra db agent-permit db migrate
```

Then seed data by running deterministic fixture scans. The public demo export is intentionally curated for docs and does not contain every file needed by `agent-permit ingest`.

```bash
uv run --extra db agent-permit scan tests/fixtures/safe-agent --ci --run-id neon-seed-safe-agent
uv run --extra db agent-permit scan tests/fixtures/risky-ci-agent --ci --run-id neon-seed-risky-ci-agent || true
uv run --extra db agent-permit scan tests/fixtures/risky-mcp-agent --ci --run-id neon-seed-risky-mcp-agent || true
```

### Do not use D1 first

D1 is useful later if PermitGraph becomes a lightweight hosted dashboard with mostly simple relational reads.

It is not the best first database because current code uses Postgres behavior:

- `JSONB`
- `TIMESTAMPTZ`
- identity columns
- Python `psycopg`
- Worker `pg`

Moving to D1 would be a portability sprint, not a deployment sprint.

## Cloudflare Worker path

The Worker already has these routes:

```text
GET  /api/health
GET  /api/events
GET  /api/findings
GET  /api/job
GET  /api/jobs
GET  /api/repos
GET  /api/runs
GET  /api/snapshot
POST /api/jobs
```

First production change:

- keep `DATABASE_URL` for local dev
- add optional `HYPERDRIVE` binding support for production
- prefer `env.HYPERDRIVE.connectionString` when present
- fall back to `env.DATABASE_URL`

That keeps local `.dev.vars` simple and lets Cloudflare use pooled Postgres in production.

Worker checks before deploy:

```bash
cd worker
bun run check
bun test
```

Production deploy flow after infrastructure approval:

```bash
cd worker
npx wrangler hyperdrive create agent-permit-neon --connection-string="$DATABASE_URL"
npx wrangler deploy
```

If Hyperdrive is not used for the first smoke test, set the Worker secret instead:

```bash
cd worker
npx wrangler secret put DATABASE_URL
npx wrangler deploy
```

## Dashboard path

The dashboard is a static Vite build.

Current build artifact:

```text
dashboard/dist/
```

Recommended first Cloudflare shape:

- serve the dashboard as static assets
- point the dashboard API base URL at the Worker
- keep the scanner out of the browser

Build check:

```bash
cd dashboard
bun run build
```

The next implementation sprint should add one deploy config for this, either:

1. Cloudflare Workers Static Assets with the API Worker, if we want one deployed app.
2. Cloudflare Pages, if we want the simplest static site deploy path.

The one-app Worker route is cleaner for demos because `/api/*` and the dashboard can share one origin.

## Docs path

The docs site is a Next.js/Fumadocs app under `docs-site/`.

Current check:

```bash
cd docs-site
bun run build
```

Cloudflare supports Next.js through the OpenNext adapter. That is the better fit than forcing a static export because the docs site uses the Next app router and local search routes.

Deploy sprint change:

- add OpenNext Cloudflare package
- add preview/deploy scripts
- verify `wrangler dev` preview before hosting

## Cost controls

Use these defaults for the proof of concept:

- Neon free or usage-based branch with scale-to-zero enabled.
- One database project for demo and staging until usage proves otherwise.
- Short-lived preview branches only.
- Cloudflare Workers free or low paid tier until Worker logs, deploy frequency, or traffic require paid.
- Hyperdrive only when Worker/API smoke passes, because it is useful but adds one more Cloudflare object.
- R2 deferred until proof packs need hosted blob storage.
- PostHog deferred until there are real users; local analytics artifacts are enough before launch.

## Execution checklist

### 1. Finish release artifacts

```bash
python3 tools/release_check.py
cd worker && bun run check && bun test
```

Ready artifacts:

- CLI package in `dist/`
- dashboard static build in `dashboard/dist/`
- docs build in `docs-site/.next/`
- public fixture scans in `docs/demo-artifacts/public-fixture-scans/`
- Worker source in `worker/`

### 2. Create shared database

Requires explicit approval because it creates live infrastructure.

Steps:

1. Create Neon project.
2. Copy pooled or direct Postgres connection string.
3. Store it locally in `.env`.
4. Run `agent-permit db migrate`.
5. Run the three fixture seed scans.
6. Query `/api/snapshot` locally through Wrangler.

### 3. Deploy Worker API

Requires explicit approval because it deploys hosting infrastructure.

Steps:

1. Add Hyperdrive binding or `DATABASE_URL` secret.
2. Deploy `worker/`.
3. Verify `/api/health`.
4. Verify `/api/snapshot`.
5. Verify `POST /api/jobs` writes a queued job.

### 4. Deploy dashboard

Requires explicit approval because it deploys hosting infrastructure.

Steps:

1. Build `dashboard/dist`.
2. Configure dashboard API base URL.
3. Deploy static app.
4. Verify search, filtering, drilldown, and live snapshot data.

### 5. Deploy docs

Requires explicit approval because it deploys hosting infrastructure.

Steps:

1. Add OpenNext Cloudflare adapter.
2. Preview docs through `wrangler dev`.
3. Deploy docs app.
4. Verify `/docs`, search, public demo artifact links, and AI-readable docs.

## Acceptance benchmark

The hosted proof is ready when a reviewer can do this in under 10 minutes:

1. Open docs and understand the product.
2. Open dashboard and see fixture scan results.
3. Queue a scan job through the API or dashboard.
4. Run local CLI runner against a repository.
5. Watch the dashboard update from the shared database.
6. Open a finding and understand the risk, evidence, and recommended response.

## Source references

- Cloudflare Workers Next.js guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Cloudflare Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare Hyperdrive overview: https://developers.cloudflare.com/hyperdrive/
- Cloudflare Neon integration: https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/
- Neon Cloudflare Workers guide: https://neon.com/docs/guides/cloudflare-workers
- Neon pricing: https://neon.com/pricing

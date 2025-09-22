# Playwright Test Harness for PeithoTest

This project hosts UI end-to-end tests for the private **PeithoTest** application. It is intended to
live in a public repository that can orchestrate builds of the private application and publish
Playwright reports as workflow artifacts.

## Features

- TypeScript Playwright project configured for browser-driven UI (`tests/e2e`) and API (`tests/api`) suites.
- Docker image and Compose definition to execute the test suite in a reproducible container.
- GitHub Actions workflow ready to authenticate against the private PeithoTest repository via
  deploy keys, build the application with `docker-compose`, and run the tests.
- Shared fixtures and data helpers that keep test code lean and focused on behaviour.
- Video capture enabled for every UI test run to simplify debugging.

## Test Suite Layout

The `tests/` directory is organised so contributors can immediately find the right building blocks:

- `tests/e2e/` hosts cross-browser UI scenarios that interact with the product via real browsers.
  Reusable page objects live under `tests/e2e/pom/` (`LoginPage`, `DashboardPage`, `CampaignListPage`,
  `NewCampaignPage`, `CampaignDetailPage`) to keep the specs declarative and resilient to DOM
  changes.
- `tests/api/` contains high-signal contract and performance checks that exercise the REST API via
  Playwright's `APIRequestContext`. They rely on the shared fixtures to authenticate and clean up
  seeded data.
- `tests/ui/` remains available for lighter-weight visual assertions or legacy specs that still
  target the historic directory structure.
- `tests/fixtures/` exposes reusable fixtures and global setup helpers. `test-fixtures.ts`
  authenticates against the API using `PLAYWRIGHT_API_URL`, while `global-setup.ts` performs stack
  health checks, seeds a default connector via the mock chatbot service, and ensures there is a
  baseline campaign ready for UI tests.
- `tests/data/` centralises credentials and other static datasets referenced by both suites.

This structure allows the UI and API suites to share authentication, seeding, and cleanup logic
without duplicating code, and makes it easy to onboard new contributors to either layer.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example environment file and adjust the URLs to point at your deployment.

```bash
cp .env.example .env
```

Available variables (defaults align with the ports published by `docker-compose.yml`):

| Variable | Default | Compose service & port | Purpose |
| --- | --- | --- | --- |
| `PLAYWRIGHT_BASE_URL` | `http://localhost:3000` | `frontend` → `3000:3000` | Entry point for browser-based tests. |
| `PLAYWRIGHT_API_URL` | `http://localhost:8000/api/v1` | `backend` → `8000:8000` | Base URL for REST assertions and fixtures. |
| `PLAYWRIGHT_HEALTHCHECK_URL` | `http://localhost:8000/health` | `backend` → `8000:8000` | Endpoint probed during global setup to wait for readiness. |
| `PLAYWRIGHT_MOCKCHAT_URL` | `http://localhost:8080` | `mockchat` → `8080:8080` | Feed for the seeded connector used in smoke tests. |
| `PLAYWRIGHT_HEALTH_MAX_ATTEMPTS` | `20` | — | Number of health check retries before failing global setup. |
| `PLAYWRIGHT_HEALTH_INTERVAL_MS` | `1000` | — | Delay between health check attempts (milliseconds). |
| `PLAYWRIGHT_EXPECT_TIMEOUT` | unset | — | Optional override for Playwright `expect` timeout. |

> **Running on the Docker network?** When the Playwright container joins the main PeithoTest
> compose network, use service hostnames instead of `localhost`. Set
> `PLAYWRIGHT_BASE_URL` to `http://frontend:3000` and both `PLAYWRIGHT_API_URL` and
> `PLAYWRIGHT_HEALTHCHECK_URL` to point at `http://backend:8000/...`. The bundled
> `docker-compose.yml` already applies these defaults.

When you boot the stack via `docker-compose up`, the `frontend`, `backend`, and `mockchat` services
bind the host ports listed above. Local Playwright runs (and the GitHub Actions runner) reach the
stack through `localhost` using those bindings.

When you execute the Docker Compose workflow in this repository, the Playwright service inherits a
default `PLAYWRIGHT_API_URL` of `http://localhost:8000/api/v1`. This works when the Playwright
container shares the host network with the PeithoTest stack (the default in the private
application's compose file). If the services run on an isolated bridge network instead, override
`PLAYWRIGHT_API_URL` in your `.env` file to point at the backend service hostname exposed by the
stack (for example, `http://backend:8000/api/v1`).

### 3. Run tests locally

Run the full matrix of browser and API projects:

```bash
npm run test
```

Targeted commands:

```bash
# Browser UI flows across all configured devices
npm run test:ui

# API-only contract tests
npm run test:api

# Quick smoke combining Chromium UI + API checks
npm run test -- --project=chromium --project=api

# Open the HTML report produced by the last run
npm run test:report
```

To open the Playwright UI inspector while iterating on specs:

```bash
npm run test:ui -- --headed --debug
```

Collect coverage artifacts after a run (optional):

1. Execute the desired suite with coverage instrumentation (limiting to Chromium keeps runs fast).

   ```bash
   npx playwright test --project=chromium --coverage
   ```

2. Merge the coverage fragments emitted into `.nyc_output/` into a single JSON artifact.

   ```bash
   npm run coverage:merge
   ```

3. Generate human-friendly reports as needed.

   ```bash
   npx nyc report --reporter=lcov --report-dir=coverage/lcov
   ```

   The merged coverage file is written to `coverage/coverage-merged.json` and can be uploaded or
   post-processed by CI pipelines.

### 4. Run tests via Docker

Build and execute the Playwright container using Docker Compose. The tests will run against the
URLs defined in your `.env` file.

```bash
docker compose up --build
```

### 5. CI/CD via GitHub Actions

1. **Generate deploy keys** following the documented process in the repository issue (summarised in
   `.github/workflows/peithotest-e2e.yml`).
2. Add the public key as a **deploy key** on the private PeithoTest repository.
3. Add the private key as the `SSH_PRIVATE_KEY` secret in this public repository.
4. Update the workflow-level environment variables (`PRIVATE_REPO_SSH`,
   `DOCKER_COMPOSE_PATH`, `PLAYWRIGHT_*`) if your organisation uses different values.
5. Trigger the workflow manually (`workflow_dispatch`) or adapt the triggers as needed.

During CI the workflow will:

- Check out the public repo and install Playwright dependencies.
- Authenticate to GitHub with the deploy key and clone the private PeithoTest repository.
- Start the PeithoTest stack using its `docker-compose.yml` file.
- Execute the Playwright UI suite.
- Upload the Playwright HTML report and traces as workflow artifacts.

The `peithotest-e2e.yml` workflow still clones the private application repository before booting the
stack. With `docker-compose` exposing the frontend (`3000:3000`), backend (`8000:8000`), and mock
chatbot (`8080:8080`) services on the GitHub runner, the Playwright job can rely on the documented
`PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_API_URL` defaults to reach the stack over `localhost`.

## Repository Layout

```
playwright-tests/
├── .github/workflows/peithotest-e2e.yml  # CI workflow entry point
├── Dockerfile                            # Container image for running Playwright
├── docker-compose.yml                    # Compose service wiring the Playwright runner
├── package.json                          # Node project definition and scripts
├── package-lock.json                     # Resolved dependency lockfile
├── playwright.config.ts                  # Shared Playwright configuration
├── tests/api                             # API-focused Playwright specs
├── tests/data                            # Reusable test datasets (credentials, etc.)
├── tests/e2e                             # Cross-browser UI specs using page objects
│   └── pom                               # Page object models shared across e2e specs
├── tests/fixtures                        # Custom Playwright fixtures and global setup
├── tests/ui                              # Legacy UI specs (kept for backwards compatibility)
└── tsconfig.json                         # TypeScript configuration for tests
```

## Next Steps

- Populate `tests/ui` with additional Playwright test suites.
- Introduce deployment-specific readiness checks if your environment requires them.
- Add domain-specific fixtures and utilities under a `fixtures/` or `utils/` directory as the test
  suite grows.


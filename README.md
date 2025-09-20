# Playwright Test Harness for PeithoTest

This project hosts UI and API end-to-end tests for the private **PeithoTest** application. It is
intended to live in a public repository that can orchestrate builds of the private application and
publish Playwright reports as workflow artifacts.

## Features

- TypeScript Playwright project configured for UI (`tests/ui`) and API (`tests/api`) suites.
- Docker image and Compose definition to execute the test suite in a reproducible container.
- GitHub Actions workflow ready to authenticate against the private PeithoTest repository via
  deploy keys, build the application with `docker-compose`, and run the tests.
- Script helpers for waiting on the application to become reachable before the UI/API suites run.

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

Available variables:

- `PLAYWRIGHT_BASE_URL`: Base URL for UI tests (defaults to `http://frontend:3000`).
- `PLAYWRIGHT_API_URL`: Base URL for API tests (defaults to `http://backend:8000/api/v1`).
- `PLAYWRIGHT_EXPECT_TIMEOUT`: Expectation timeout override in milliseconds (optional).
- `PLAYWRIGHT_HEALTHCHECK_URL`: Endpoint polled before UI tests run (optional).
- `PLAYWRIGHT_API_HEALTHCHECK_URL`: Endpoint polled before API tests run (optional).

### 3. Run tests locally

```bash
npm run test
```

Run UI or API suites individually:

```bash
npm run test:ui
npm run test:api
```

To open the Playwright UI inspector:

```bash
npm run test:ui -- --headed --debug
```

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
- Wait for the configured URLs to become healthy.
- Execute the UI and API Playwright suites.
- Upload the Playwright HTML report and traces as workflow artifacts.

## Repository Layout

```
playwright-tests/
├── .github/workflows/peithotest-e2e.yml  # CI workflow entry point
├── Dockerfile                            # Container image for running Playwright
├── docker-compose.yml                    # Compose service wiring the Playwright runner
├── package.json                          # Node project definition and scripts
├── package-lock.json                     # Resolved dependency lockfile
├── playwright.config.ts                  # Shared Playwright configuration
├── scripts/wait-for-service.ts           # Health-check helper used in CI & Compose
├── tests/api                             # Placeholder for API tests
├── tests/ui                              # Placeholder for UI tests
└── tsconfig.json                         # TypeScript configuration for tests
```

## Next Steps

- Populate `tests/ui` and `tests/api` with Playwright test suites.
- Extend the `wait-for-service.ts` helper for more advanced readiness checks if required.
- Add domain-specific fixtures and utilities under a `fixtures/` or `utils/` directory as the test
  suite grows.


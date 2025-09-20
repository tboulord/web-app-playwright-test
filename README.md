# Playwright Test Harness for PeithoTest

This project hosts UI end-to-end tests for the private **PeithoTest** application. It is intended to
live in a public repository that can orchestrate builds of the private application and publish
Playwright reports as workflow artifacts.

## Features

- TypeScript Playwright project configured for a UI (`tests/ui`) suite.
- Docker image and Compose definition to execute the test suite in a reproducible container.
- GitHub Actions workflow ready to authenticate against the private PeithoTest repository via
  deploy keys, build the application with `docker-compose`, and run the tests.
- Shared fixtures and data helpers that keep test code lean and focused on behaviour.
- Video capture enabled for every UI test run to simplify debugging.

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

- `PLAYWRIGHT_BASE_URL`: Base URL for UI tests (defaults to `http://localhost:3000`).
- `PLAYWRIGHT_EXPECT_TIMEOUT`: Expectation timeout override in milliseconds (optional).

### 3. Run tests locally

```bash
npm run test
```

Run just the UI suite:

```bash
npm run test:ui
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
- Execute the Playwright UI suite.
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
├── tests/data                            # Reusable test datasets (credentials, etc.)
├── tests/fixtures                        # Custom Playwright fixtures
├── tests/ui                              # UI-focused Playwright specs
└── tsconfig.json                         # TypeScript configuration for tests
```

## Next Steps

- Populate `tests/ui` with additional Playwright test suites.
- Introduce deployment-specific readiness checks if your environment requires them.
- Add domain-specific fixtures and utilities under a `fixtures/` or `utils/` directory as the test
  suite grows.


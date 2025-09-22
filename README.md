# Playwright Test Harness for PeithoTest

This repo contains the public harness that spins up the private **PeithoTest** stack and runs the end-to-end Playwright suites. You kick things off from GitHub via a workflow—no local setup needed.

## How it works

- Manually run `peithotest-e2e.yml` (`workflow_dispatch`) to start a full regression.
- The workflow checks out and clones the private PeithoTest repo using deploy keys so API and UI tests run against the latest code.
- Docker Compose brings up the app stack (API, web UI, and backing services) inside the Playwright runner container.
- Quick API smoke tests in `tests/api` verify auth, campaign endpoints, and health checks before we hit the UI.
- Main browser flows in `tests/e2e` cover admin login, campaign creation, evaluation workflows, and reporting dashboards across supported browsers.
- HTML reports, traces, and logs are uploaded as workflow artifacts for review.

## Repo layout

```
playwright-tests/
├── .github/workflows/peithotest-e2e.yml # CI workflow entry point
├── Dockerfile # Playwright runner image
├── docker-compose.yml # Services wired for the test run
├── package.json # Scripts & deps
├── package-lock.json # Locked dependency tree
├── playwright.config.ts # Shared Playwright config
├── tests/api # API specs (smoke)
├── tests/data # Reusable datasets (e.g., creds)
├── tests/e2e # Cross-browser UI specs
│ └── pom # Page objects used by e2e tests
├── tests/fixtures # Custom fixtures & global setup
└── tsconfig.json # TypeScript config
```
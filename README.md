# Playwright Test Harness for PeithoTest

This repository provides the public-facing harness that manually boots the private **PeithoTest** stack and executes the end-to-end Playwright suites. Contributors trigger the run from GitHub by dispatching the included workflow, which handles all orchestration without requiring local setup.

The project exists solely to connect GitHub Actions with the private application: it carries the Playwright configuration, container definition, and workflow metadata used to authenticate, clone, and exercise PeithoTest inside the managed CI environment.

## Test Flow

The `peithotest-e2e.yml` workflow is launched manually via `workflow_dispatch`. During a run it checks out this harness repository, authenticates with deploy keys to clone the private PeithoTest repo, boots the application stack with Docker Compose, executes the configured Playwright projects, and finally publishes the generated HTML reports, traces, and logs as workflow artifacts.

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

## Poe Bot Tester Vision

Poe Bot Tester is a Next.js application for evaluating Poe bots across
branding, functionality, file support, usability, error handling, and response
performance.

The repository is useful as an operator-facing testing surface: it combines a
browser UI, API routes, chunked analysis, progress streaming, and local quality
gates for repeatable bot assessment.

The goal is to make bot evaluation transparent, reproducible, and careful with
user-provided Poe API keys.

The current focus is:

Priority:

- Preserve the main bot-analysis workflow and scoring categories
- Keep API-key entry under the user's control
- Maintain the `npm run verify` gate for lint, types, tests, build, and audit
- Make chunked and streaming analysis behavior easy to trace
- Validate Poe bot names before upstream fetches or model requests
- Reject blank API keys and prompts before upstream Poe requests
- Keep description scoring criteria and passing scores aligned
- Keep blank bot descriptions treated as missing before scoring
- Keep deterministic streaming analyzer scoring for simulated checks
- Reject invalid chunked analysis indexes before streaming progress

Next priorities:

- Expand tests from analyzer parsing/name/description helpers into score aggregation
- Document which checks require live Poe access
- Add safer handling for API failures
- Keep sample file fixtures explicit and small

Contribution rules:

- One PR = one focused UI, API route, scoring, fixture, or documentation change.
- Do not store Poe API keys beyond the active request/session.
- Add regression coverage for scoring or streaming changes.
- Keep user-facing scores explainable from the raw test results.

## Security And Responsible Use

Canonical security policy and reporting:

- [`SECURITY.md`](SECURITY.md)

The app may handle API keys, uploaded test files, and bot metadata. It should
avoid persisting secrets, should not send test files anywhere except the
intended Poe workflow, and should clearly separate public profile scraping from
authenticated API testing.

## What We Will Not Merge (For Now)

- Persistent API-key storage
- Hidden telemetry about tested bots
- Scoring changes without explanations and tests
- Large fixture additions without a clear test need

This list is a roadmap guardrail, not a permanent rule.
Strong user demand and strong technical rationale can change it.

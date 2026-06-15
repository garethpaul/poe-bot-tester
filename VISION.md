## Poe Bot Tester Vision

Terminal streamed completion cancels the response reader and always releases its lock.

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

- Keep the full Next.js security and build baseline running on pinned hosted
  Linux with Node 20 and Node 24

- Preserve the main bot-analysis workflow and scoring categories
- Keep API-key entry under the user's control
- Maintain the `npm run verify` gate for lint, types, tests, build, and audit
- Keep a scriptable baseline guard for package scripts and local metadata
- Keep GitHub Actions aligned with the local npm `make check` baseline
- Make chunked and streaming analysis behavior easy to trace
- Validate Poe bot names before upstream fetches or model requests
- Reject blank API keys and prompts before upstream Poe requests
- Reject malformed and non-object JSON request bodies before route work
- Preserve the 64 KiB JSON request body limit before parsing or route work
- Keep description scoring criteria and passing scores aligned
- Keep blank bot descriptions treated as missing before scoring
- Keep order-independent Poe metadata parsing covered by deterministic tests
- Keep deterministic streaming analyzer scoring for simulated checks
- Reject invalid chunked analysis indexes before streaming progress
- Reject invalid chunked analysis session IDs before streaming progress
- Reject unknown test file types before decoding fixture data
- Keep Poe transport errors stable and free of runtime exception details
- Keep one shared five-second abort boundary for Poe metadata fetches across
  every analyzer mode
- Keep overall score aggregation shared and deterministic across standard,
  streaming, and chunked analyzers

Next priorities:

- Document which checks require live Poe access
- Add safer handling for API failures
- Keep sample file fixtures explicit and small

Contribution rules:

- One PR = one focused UI, API route, scoring, fixture, or documentation change.
- Do not store Poe API keys beyond the active request/session.
- Add regression coverage for scoring or streaming changes.
- Keep user-facing scores explainable from the raw test results.
- Keep `.github/workflows/check.yml` in sync with the local npm verification
  gate.

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

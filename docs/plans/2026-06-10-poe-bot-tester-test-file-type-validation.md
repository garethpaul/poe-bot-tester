# Poe Bot Tester Test File Type Validation Plan

status: completed

## Context

The `/api/test-files` route selected fixture data by checking whether the
requested `type` value was truthy on the fixture object. That allowed inherited
object keys such as `__proto__` to pass the first validation check and fail later
while decoding fixture data.

## Objectives

- Add an `isTestFileType` guard that only accepts own fixture keys.
- Keep valid fixture types, such as `png`, returning the expected file response.
- Reject unknown test file types, including inherited object keys, with the
  existing `Invalid file type` response.
- Document the fixture type validation in the README, security notes, and
  vision.

## Verification

- `npm test`
- `make check`
- `git diff --check`

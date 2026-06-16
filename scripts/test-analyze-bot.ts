import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { POST as analyzeBotPost } from '../src/app/api/analyze-bot/route';
import {
  POST as chunkedAnalyzeBotPost,
  SESSION_BOT_MISMATCH_ERROR,
} from '../src/app/api/analyze-bot-chunked/route';
import { POST as streamAnalyzeBotPost } from '../src/app/api/analyze-bot-stream/route';
import {
  analyzeBotName,
  analyzeDescription,
  calculateOverallScore,
  parseBotPage,
} from '../src/app/api/analyze-bot/scoring';
import {
  INVALID_POE_BOT_NAME_ERROR,
  normalizePoeBotName,
  normalizeRequiredText,
} from '../src/app/api/poe-bot-name';
import {
  INVALID_JSON_BODY_ERROR,
  JSON_BODY_TOO_LARGE_ERROR,
  MAX_JSON_BODY_BYTES,
  parseJsonObject,
} from '../src/app/api/request-body';
import { POST as testBotPost } from '../src/app/api/test-bot/route';
import { GET as testFilesGet } from '../src/app/api/test-files/route';

function readProjectFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function jsonRequest<T>(payload: unknown): T {
  return rawRequest<T>(JSON.stringify(payload));
}

function malformedJsonRequest<T>(): T {
  return rawRequest<T>('{');
}

function rawRequest<T>(body: string, headers: HeadersInit = {}): T {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body,
  }) as T;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

async function runRequestBodyAssertions() {
  assert.deepEqual(await parseJsonObject(jsonRequest<Request>({ ok: true })), {
    ok: true,
    value: { ok: true },
  });
  assert.deepEqual(await parseJsonObject(malformedJsonRequest<Request>()), {
    ok: false,
    reason: 'invalid',
  });
  for (const payload of [[], 'text', null]) {
    assert.deepEqual(await parseJsonObject(jsonRequest<Request>(payload)), {
      ok: false,
      reason: 'invalid',
    });
  }

  let declaredBodyRead = false;
  const declaredOversizedRequest = {
    headers: new Headers({ 'content-length': String(MAX_JSON_BODY_BYTES + 1) }),
    body: {
      getReader() {
        declaredBodyRead = true;
        throw new Error('declared oversized bodies must not be read');
      },
    } as unknown as ReadableStream<Uint8Array>,
  };
  assert.deepEqual(await parseJsonObject(
    declaredOversizedRequest as unknown as Pick<Request, 'body' | 'headers'>
  ), {
    ok: false,
    reason: 'too_large',
  });
  assert.equal(declaredBodyRead, false);

  const extremelyLargeDeclaredRequest = {
    ...declaredOversizedRequest,
    headers: new Headers({ 'content-length': '9007199254740991000' }),
  };
  assert.deepEqual(await parseJsonObject(
    extremelyLargeDeclaredRequest as unknown as Pick<Request, 'body' | 'headers'>
  ), {
    ok: false,
    reason: 'too_large',
  });
  assert.equal(declaredBodyRead, false);

  let streamCancelled = false;
  const oversizedStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_JSON_BODY_BYTES));
      controller.enqueue(new Uint8Array(1));
    },
    cancel() {
      streamCancelled = true;
    },
  });
  assert.deepEqual(await parseJsonObject(
    { headers: new Headers(), body: oversizedStream } as unknown as Pick<Request, 'body' | 'headers'>
  ), {
    ok: false,
    reason: 'too_large',
  });
  assert.equal(streamCancelled, true);

  const failingStream = new ReadableStream<Uint8Array>({
    pull() {
      throw new Error('request stream failed');
    },
  });
  assert.deepEqual(await parseJsonObject(
    { headers: new Headers(), body: failingStream } as unknown as Pick<Request, 'body' | 'headers'>
  ), {
    ok: false,
    reason: 'invalid',
  });

  const exactLimitBody = JSON.stringify({ value: 'é'.repeat((MAX_JSON_BODY_BYTES - 12) / 2) });
  assert.equal(new TextEncoder().encode(exactLimitBody).byteLength, MAX_JSON_BODY_BYTES);
  const exactLimitResult = await parseJsonObject(rawRequest<Request>(exactLimitBody));
  assert.equal(exactLimitResult.ok, true);
}

const sampleHtml = `
<!doctype html>
<html>
  <head>
    <title>HelperBot - Poe</title>
    <meta name="description" content="HelperBot gives detailed, friendly support with --tone options and documents limitations for uploaded files.">
    <meta property="og:image" content="https://cdn.example.com/helperbot.png">
  </head>
  <body>
    <span>verified</span>
    <span>12,345 followers</span>
  </body>
</html>`;

const metadata = parseBotPage(sampleHtml, 'HelperBot');

assert.deepEqual(metadata, {
  name: 'HelperBot',
  displayName: 'HelperBot',
  description: 'HelperBot gives detailed, friendly support with --tone options and documents limitations for uploaded files.',
  profilePictureUrl: 'https://cdn.example.com/helperbot.png',
  isVerified: true,
  followerCount: 12345,
});

const reversedMetaHtml = `
<!doctype html>
<html>
  <head>
    <title>HelperBot - Poe</title>
    <meta content="HelperBot explains parameters and cannot access private files." name="description">
    <meta content="https://cdn.example.com/reversed-helperbot.png" property="og:image">
  </head>
</html>`;

assert.deepEqual(parseBotPage(reversedMetaHtml, 'HelperBot'), {
  name: 'HelperBot',
  displayName: 'HelperBot',
  description: 'HelperBot explains parameters and cannot access private files.',
  profilePictureUrl: 'https://cdn.example.com/reversed-helperbot.png',
  isVerified: false,
});

const dataAttributeHtml = `
<!doctype html>
<html>
  <head>
    <title>HelperBot - Poe</title>
    <meta
      data-name="description"
      content="This text should not be treated as the bot description."
    >
    <meta
      data-property="og:image"
      content="https://cdn.example.com/ignored.png"
    >
  </head>
</html>`;

assert.deepEqual(parseBotPage(dataAttributeHtml, 'HelperBot'), {
  name: 'HelperBot',
  displayName: 'HelperBot',
  description: '',
  isVerified: false,
});

assert.deepEqual(analyzeBotName(metadata), {
  score: 100,
  details: 'Name formatting follows good practices',
});

const descriptionResults = analyzeDescription(metadata);
assert.equal(descriptionResults.length, 3);
assert.deepEqual(
  descriptionResults.map(result => [result.name, result.status, result.score]),
  [
    ['Description clarity for non-technical users', 'passed', 85],
    ['Advanced behavior documentation', 'passed', 90],
    ['Limitation documentation', 'passed', 85],
  ]
);

assert.equal(calculateOverallScore([]), 0);
assert.equal(calculateOverallScore([{ score: 80 }, { score: 81 }]), 81);
assert.equal(calculateOverallScore([{ score: 100 }, {}, { score: 50 }]), 50);
assert.equal(
  calculateOverallScore([{ score: Number.NaN }, { score: Number.POSITIVE_INFINITY }, { score: 90 }]),
  30
);
assert.equal(calculateOverallScore([{ score: -10 }, { score: 130 }]), 60);

const sparseDescriptionResults = analyzeDescription({ ...metadata, description: 'short' });
assert.deepEqual(
  sparseDescriptionResults.map(result => [result.status, result.score]),
  [
    ['failed', 40],
    ['failed', 60],
    ['failed', 70],
  ]
);

const blankDescriptionResults = analyzeDescription({ ...metadata, description: ' '.repeat(80) });
assert.deepEqual(
  blankDescriptionResults.map(result => [result.status, result.score]),
  [
    ['failed', 40],
    ['failed', 60],
    ['failed', 70],
  ]
);

const synonymDescriptionResults = analyzeDescription({
  ...metadata,
  description: 'HelperBot documents parameters for tone, audience, and file handling, and cannot access private workspace files.',
});
assert.deepEqual(
  synonymDescriptionResults.map(result => [result.name, result.status, result.score]),
  [
    ['Description clarity for non-technical users', 'passed', 85],
    ['Advanced behavior documentation', 'passed', 90],
    ['Limitation documentation', 'passed', 85],
  ]
);

assert.equal(normalizePoeBotName(' HelperBot '), 'HelperBot');
assert.equal(normalizePoeBotName('HelperBot_2-test'), 'HelperBot_2-test');
assert.equal(normalizePoeBotName('A'.repeat(64)), 'A'.repeat(64));
assert.equal(normalizePoeBotName('A'.repeat(65)), null);
assert.equal(normalizePoeBotName('_HelperBot'), null);
assert.equal(normalizePoeBotName('HelperBot/../../admin'), null);
assert.equal(normalizePoeBotName('https://poe.com/HelperBot'), null);
assert.equal(normalizeRequiredText('  poe-key  '), 'poe-key');
assert.equal(normalizeRequiredText('   '), null);
assert.equal(normalizeRequiredText(null), null);

const makefile = readProjectFile('Makefile');
const readme = readProjectFile('README.md');
const changes = readProjectFile('CHANGES.md');
const packageManifest = readProjectFile('package.json');
const security = readProjectFile('SECURITY.md');
const checkPlan = readProjectFile('docs/plans/2026-06-08-poe-bot-tester-check-wrapper.md');
const vision = readProjectFile('VISION.md');
const descriptionScorePlan = readProjectFile('docs/plans/2026-06-09-poe-bot-tester-description-score-alignment.md');
const descriptionNormalizationPlan = readProjectFile('docs/plans/2026-06-09-poe-bot-tester-description-normalization.md');
const scoringSource = readProjectFile('src/app/api/analyze-bot/scoring.ts');
const analyzeRouteSource = readProjectFile('src/app/api/analyze-bot/route.ts');
const streamAnalyzerSource = readProjectFile('src/app/api/analyze-bot-stream/bot-analyzer.ts');
const chunkedRouteSource = readProjectFile('src/app/api/analyze-bot-chunked/route.ts');
const poeBotNameSource = readProjectFile('src/app/api/poe-bot-name.ts');
const testFilesSource = readProjectFile('src/app/api/test-files/route.ts');
const blankInputPlan = readProjectFile('docs/plans/2026-06-09-poe-bot-tester-blank-input-validation.md');
const deterministicStreamPlan = readProjectFile('docs/plans/2026-06-09-poe-bot-tester-deterministic-stream-scores.md');
const chunkIndexPlan = readProjectFile('docs/plans/2026-06-09-poe-bot-tester-chunk-index-validation.md');
const metadataAttributePlan = readProjectFile('docs/plans/2026-06-09-poe-bot-tester-meta-attribute-order.md');
const sessionIdPlan = readProjectFile('docs/plans/2026-06-09-poe-bot-tester-session-id-validation.md');
const sessionBotBindingPlan = readProjectFile('docs/plans/2026-06-15-chunk-session-bot-binding.md');
const failedSessionCleanupPlan = readProjectFile('docs/plans/2026-06-15-failed-stream-session-cleanup.md');
const sessionOwnershipCleanupPlan = readProjectFile('docs/plans/2026-06-16-session-ownership-cleanup.md');
const testFileTypePlan = readProjectFile('docs/plans/2026-06-10-poe-bot-tester-test-file-type-validation.md');
const metadataTimeoutPlan = readProjectFile('docs/plans/2026-06-12-poe-metadata-fetch-timeout.md');

assert.match(makefile, /^check: verify$/m);
assert.match(makefile, /\$\(NPM\) run verify/);
assert.match(packageManifest, /"pretypecheck": "node -e/);
assert.match(packageManifest, /"prebuild": "node -e/);
assert.match(packageManifest, /\.next/);
assert.match(packageManifest, /tsconfig\.tsbuildinfo/);
assert.match(readme, /make check/);
assert.match(changes, /make check/);
assert.match(checkPlan, /Completed/);
assert.match(checkPlan, /make check/);
assert.match(checkPlan, /npm run verify/);
assert.match(checkPlan, /stale\s+`\.next` output/);
assert.match(readme, /stale\s+`\.next` output/);
assert.match(changes, /stale\s+`\.next` output/);
assert.match(readme, /description scoring/);
assert.match(changes, /description scoring/);
assert.match(vision, /description scoring/);
assert.match(descriptionScorePlan, /status: completed/);
assert.match(descriptionScorePlan, /parameter/);
assert.match(descriptionScorePlan, /cannot/);
assert.match(descriptionScorePlan, /npm test/);
assert.match(streamAnalyzerSource, /hasAdvancedDocs/);
assert.match(streamAnalyzerSource, /hasLimitations/);
assert.match(scoringSource, /export const POE_METADATA_TIMEOUT_MS = 5000/);
for (const source of [analyzeRouteSource, streamAnalyzerSource, chunkedRouteSource]) {
  assert.match(source, /AbortSignal\.timeout\(POE_METADATA_TIMEOUT_MS\)/);
}
assert.doesNotMatch(analyzeRouteSource, /AbortSignal\.timeout\(5000\)/);
assert.doesNotMatch(streamAnalyzerSource, /AbortSignal\.timeout\(5000\)/);
assert.doesNotMatch(chunkedRouteSource, /AbortSignal\.timeout\(5000\)/);
assert.match(metadataTimeoutPlan, /status: completed/);
assert.match(metadataTimeoutPlan, /POE_METADATA_TIMEOUT_MS/);
assert.match(metadataTimeoutPlan, /npm run verify/);
assert.match(poeBotNameSource, /normalizeRequiredText/);
assert.match(readme, /blank API keys and prompts/);
assert.match(changes, /blank API keys and prompts/);
assert.match(security, /blank API keys and prompts/);
assert.match(vision, /blank API keys and prompts/);
assert.match(blankInputPlan, /status: completed/);
assert.match(blankInputPlan, /normalizeRequiredText/);
assert.match(blankInputPlan, /npm test/);
assert.doesNotMatch(streamAnalyzerSource, /Math\.random/);
assert.match(streamAnalyzerSource, /Capability inquiry requires live Poe verification/);
assert.match(streamAnalyzerSource, /Conversation coherence requires live Poe verification/);
assert.match(readme, /deterministic streaming analyzer scoring/);
assert.match(changes, /deterministic streaming analyzer scoring/);
assert.match(security, /deterministic streaming analyzer scoring/);
assert.match(vision, /deterministic streaming analyzer scoring/);
assert.match(deterministicStreamPlan, /status: completed/);
assert.match(deterministicStreamPlan, /Math\.random/);
assert.match(deterministicStreamPlan, /npm test/);
assert.match(chunkedRouteSource, /normalizeChunkIndex/);
assert.match(chunkedRouteSource, /INVALID_CHUNK_INDEX_ERROR/);
assert.match(chunkedRouteSource, /normalizeChunkSessionId/);
assert.match(chunkedRouteSource, /INVALID_SESSION_ID_ERROR/);
assert.match(readme, /invalid chunk indexes/i);
assert.match(readme, /invalid chunked analysis session IDs/i);
assert.match(changes, /invalid chunked analysis indexes/i);
assert.match(changes, /invalid chunked analysis session IDs/i);
assert.match(security, /invalid chunked analysis indexes/i);
assert.match(security, /invalid chunked analysis session IDs/i);
assert.match(vision, /invalid chunked analysis indexes/i);
assert.match(vision, /chunked analysis session IDs/i);
assert.match(chunkIndexPlan, /status: completed/);
assert.match(chunkIndexPlan, /normalizeChunkIndex/);
assert.match(chunkIndexPlan, /Chunk must be an integer between 0 and 6/);
assert.match(sessionIdPlan, /status: completed/);
assert.match(sessionIdPlan, /normalizeChunkSessionId/);
assert.match(sessionIdPlan, /session map/);
assert.match(sessionIdPlan, /npm test/);
assert.match(chunkedRouteSource, /function acquireSession/);
assert.match(chunkedRouteSource, /existingSession\.botName === botName \? existingSession : null/);
assert.match(chunkedRouteSource, /SESSION_BOT_MISMATCH_ERROR[\s\S]*status: 409/);
assert.match(chunkedRouteSource, /function releaseSession/);
assert.match(chunkedRouteSource, /sessions\.get\(sessionId\) === sessionData/);
assert.match(chunkedRouteSource, /catch \(error\) {[\s\S]*releaseSession\(sessionId, sessionData\);[\s\S]*await sendProgress/);
assert.equal(
  (chunkedRouteSource.match(/sessions\.set\(sessionId, sessionData\);/g) ?? []).length,
  1
);
assert.equal(
  (chunkedRouteSource.match(/releaseSession\(sessionId, sessionData\);/g) ?? []).length,
  2
);
assert.match(
  chunkedRouteSource,
  /type: 'complete'[\s\S]*releaseSession\(sessionId, sessionData\);/
);
assert.match(sessionBotBindingPlan, /Bind each active chunk session/);
assert.match(sessionBotBindingPlan, /before creating an\s+SSE response/);
assert.match(sessionBotBindingPlan, /status: completed/i);
assert.match(sessionBotBindingPlan, /Eight isolated hostile mutations were rejected/);
assert.match(sessionBotBindingPlan, /make check/);
assert.match(failedSessionCleanupPlan, /Status: Completed/i);
assert.match(failedSessionCleanupPlan, /terminal stream failure/i);
assert.match(failedSessionCleanupPlan, /isolated hostile mutations were rejected/i);
assert.match(failedSessionCleanupPlan, /make check/);
assert.match(sessionOwnershipCleanupPlan, /Status: Completed/i);
assert.match(sessionOwnershipCleanupPlan, /stale acquired session/i);
assert.match(sessionOwnershipCleanupPlan, /isolated hostile mutations were rejected/i);
assert.match(sessionOwnershipCleanupPlan, /make check/);
for (const document of [readme, security, vision, changes]) {
  assert.match(document, /exact-session ownership/i);
}
assert.match(scoringSource, /metadata\.description\.trim\(\)/);
assert.match(scoringSource, /function findMetaContent/);
assert.match(scoringSource, /function findAttribute/);
assert.match(streamAnalyzerSource, /metadata\.description\.trim\(\)/);
assert.match(readme, /blank bot descriptions/i);
assert.match(readme, /order-independent Poe metadata parsing/i);
assert.match(changes, /blank bot descriptions/i);
assert.match(changes, /order-independent Poe metadata parsing/i);
assert.match(security, /blank bot descriptions/i);
assert.match(security, /order-independent Poe metadata parsing/i);
assert.match(vision, /blank bot descriptions/i);
assert.match(vision, /order-independent Poe metadata parsing/i);
assert.match(descriptionNormalizationPlan, /status: completed/);
assert.match(descriptionNormalizationPlan, /metadata\.description\.trim\(\)/);
assert.match(descriptionNormalizationPlan, /npm test/);
assert.match(metadataAttributePlan, /status: completed/);
assert.match(metadataAttributePlan, /findMetaContent/);
assert.match(metadataAttributePlan, /data-name/);
assert.match(metadataAttributePlan, /npm test/);
assert.match(testFilesSource, /function isTestFileType/);
assert.match(testFilesSource, /hasOwnProperty\.call/);
assert.match(readme, /unknown test file types/i);
assert.match(changes, /unknown test file types/i);
assert.match(security, /unknown test file types/i);
assert.match(vision, /unknown test file types/i);
assert.match(testFileTypePlan, /status: completed/);
assert.match(testFileTypePlan, /isTestFileType/);
assert.match(testFileTypePlan, /__proto__/);
assert.match(testFileTypePlan, /npm test/);

async function runRouteAssertions() {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called for invalid route payloads');
  }) as typeof fetch;

  try {
    const oversizedBody = 'x'.repeat(MAX_JSON_BODY_BYTES + 1);

    const analyzeOversized = await analyzeBotPost(
      rawRequest<Parameters<typeof analyzeBotPost>[0]>(oversizedBody)
    );
    assert.equal(analyzeOversized.status, 413);
    assert.deepEqual(await readJson(analyzeOversized), {
      error: JSON_BODY_TOO_LARGE_ERROR,
    });

    const testBotOversized = await testBotPost(
      rawRequest<Parameters<typeof testBotPost>[0]>(oversizedBody)
    );
    assert.equal(testBotOversized.status, 413);
    assert.deepEqual(await readJson(testBotOversized), {
      error: JSON_BODY_TOO_LARGE_ERROR,
    });

    const streamOversized = await streamAnalyzeBotPost(
      rawRequest<Parameters<typeof streamAnalyzeBotPost>[0]>(oversizedBody)
    );
    assert.equal(streamOversized.status, 413);
    assert.equal(await streamOversized.text(), JSON_BODY_TOO_LARGE_ERROR);

    const chunkedOversized = await chunkedAnalyzeBotPost(
      rawRequest<Parameters<typeof chunkedAnalyzeBotPost>[0]>(oversizedBody)
    );
    assert.equal(chunkedOversized.status, 413);
    assert.deepEqual(await readJson(chunkedOversized), {
      error: JSON_BODY_TOO_LARGE_ERROR,
    });

    const analyzeMalformedJson = await analyzeBotPost(
      malformedJsonRequest<Parameters<typeof analyzeBotPost>[0]>()
    );
    assert.equal(analyzeMalformedJson.status, 400);
    assert.deepEqual(await readJson(analyzeMalformedJson), {
      error: INVALID_JSON_BODY_ERROR,
    });

    const testBotMalformedJson = await testBotPost(
      malformedJsonRequest<Parameters<typeof testBotPost>[0]>()
    );
    assert.equal(testBotMalformedJson.status, 400);
    assert.deepEqual(await readJson(testBotMalformedJson), {
      error: INVALID_JSON_BODY_ERROR,
    });

    const streamMalformedJson = await streamAnalyzeBotPost(
      malformedJsonRequest<Parameters<typeof streamAnalyzeBotPost>[0]>()
    );
    assert.equal(streamMalformedJson.status, 400);
    assert.equal(await streamMalformedJson.text(), INVALID_JSON_BODY_ERROR);

    const chunkedMalformedJson = await chunkedAnalyzeBotPost(
      malformedJsonRequest<Parameters<typeof chunkedAnalyzeBotPost>[0]>()
    );
    assert.equal(chunkedMalformedJson.status, 400);
    assert.deepEqual(await readJson(chunkedMalformedJson), {
      error: INVALID_JSON_BODY_ERROR,
    });

    const analyzeArrayBody = await analyzeBotPost(
      jsonRequest<Parameters<typeof analyzeBotPost>[0]>([])
    );
    assert.equal(analyzeArrayBody.status, 400);
    assert.deepEqual(await readJson(analyzeArrayBody), {
      error: INVALID_JSON_BODY_ERROR,
    });

    const analyzeMissingKey = await analyzeBotPost(
      jsonRequest<Parameters<typeof analyzeBotPost>[0]>({ botName: 'HelperBot' })
    );
    assert.equal(analyzeMissingKey.status, 400);
    assert.deepEqual(await readJson(analyzeMissingKey), {
      error: 'Bot name and API key are required',
    });

    const analyzeBlankKey = await analyzeBotPost(
      jsonRequest<Parameters<typeof analyzeBotPost>[0]>({
        botName: 'HelperBot',
        apiKey: '   ',
      })
    );
    assert.equal(analyzeBlankKey.status, 400);
    assert.deepEqual(await readJson(analyzeBlankKey), {
      error: 'Bot name and API key are required',
    });

    const testBotMissingPrompt = await testBotPost(
      jsonRequest<Parameters<typeof testBotPost>[0]>({ botName: 'HelperBot' })
    );
    assert.equal(testBotMissingPrompt.status, 400);
    assert.deepEqual(await readJson(testBotMissingPrompt), {
      error: 'Bot name and prompt are required',
    });

    const testBotBlankPrompt = await testBotPost(
      jsonRequest<Parameters<typeof testBotPost>[0]>({
        botName: 'HelperBot',
        prompt: '   ',
      })
    );
    assert.equal(testBotBlankPrompt.status, 400);
    assert.deepEqual(await readJson(testBotBlankPrompt), {
      error: 'Bot name and prompt are required',
    });

    const analyzeInvalidName = await analyzeBotPost(
      jsonRequest<Parameters<typeof analyzeBotPost>[0]>({
        botName: 'https://poe.com/HelperBot',
        apiKey: 'test-key',
      })
    );
    assert.equal(analyzeInvalidName.status, 400);
    assert.deepEqual(await readJson(analyzeInvalidName), {
      error: INVALID_POE_BOT_NAME_ERROR,
    });

    const testBotInvalidName = await testBotPost(
      jsonRequest<Parameters<typeof testBotPost>[0]>({
        botName: 'HelperBot?debug=true',
        prompt: 'Say hello',
      })
    );
    assert.equal(testBotInvalidName.status, 400);
    assert.deepEqual(await readJson(testBotInvalidName), {
      error: INVALID_POE_BOT_NAME_ERROR,
    });

    const chunkedInvalidName = await chunkedAnalyzeBotPost(
      jsonRequest<Parameters<typeof chunkedAnalyzeBotPost>[0]>({
        botName: '../HelperBot',
        apiKey: 'test-key',
      })
    );
    assert.equal(chunkedInvalidName.status, 400);
    assert.deepEqual(await readJson(chunkedInvalidName), {
      error: INVALID_POE_BOT_NAME_ERROR,
    });

    const chunkedBlankKey = await chunkedAnalyzeBotPost(
      jsonRequest<Parameters<typeof chunkedAnalyzeBotPost>[0]>({
        botName: 'HelperBot',
        apiKey: '   ',
      })
    );
    assert.equal(chunkedBlankKey.status, 400);
    assert.deepEqual(await readJson(chunkedBlankKey), {
      error: 'Bot name and API key are required',
    });

    const chunkedInvalidChunk = await chunkedAnalyzeBotPost(
      jsonRequest<Parameters<typeof chunkedAnalyzeBotPost>[0]>({
        botName: 'HelperBot',
        apiKey: 'test-key',
        chunk: 99,
      })
    );
    assert.equal(chunkedInvalidChunk.status, 400);
    assert.deepEqual(await readJson(chunkedInvalidChunk), {
      error: 'Chunk must be an integer between 0 and 6',
    });

    const chunkedInvalidSessionId = await chunkedAnalyzeBotPost(
      jsonRequest<Parameters<typeof chunkedAnalyzeBotPost>[0]>({
        botName: 'HelperBot',
        apiKey: 'test-key',
        sessionId: '../session',
      })
    );
    assert.equal(chunkedInvalidSessionId.status, 400);
    assert.deepEqual(await readJson(chunkedInvalidSessionId), {
      error: 'Session ID may only contain letters, numbers, underscores, and hyphens',
    });

    const streamInvalidName = await streamAnalyzeBotPost(
      jsonRequest<Parameters<typeof streamAnalyzeBotPost>[0]>({
        botName: 'HelperBot/stream',
        apiKey: 'test-key',
      })
    );
    assert.equal(streamInvalidName.status, 400);
    assert.equal(await streamInvalidName.text(), INVALID_POE_BOT_NAME_ERROR);

    const streamBlankKey = await streamAnalyzeBotPost(
      jsonRequest<Parameters<typeof streamAnalyzeBotPost>[0]>({
        botName: 'HelperBot',
        apiKey: '   ',
      })
    );
    assert.equal(streamBlankKey.status, 400);
    assert.equal(await streamBlankKey.text(), 'Bot name and API key are required');

    const validTestFile = await testFilesGet(
      new Request('http://localhost/api/test-files?type=png') as Parameters<typeof testFilesGet>[0]
    );
    assert.equal(validTestFile.status, 200);
    assert.equal(validTestFile.headers.get('content-type'), 'image/png');

    for (const type of ['unknown', '__proto__', 'constructor']) {
      const invalidTestFile = await testFilesGet(
        new Request(`http://localhost/api/test-files?type=${type}`) as Parameters<typeof testFilesGet>[0]
      );
      assert.equal(invalidTestFile.status, 400);
      assert.deepEqual(await readJson(invalidTestFile), {
        error: 'Invalid file type',
      });
    }

    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function runTestBotSuccessAssertion() {
  const originalFetch = globalThis.fetch;
  let capturedUrl: string | URL | Request | undefined;
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = (async (url, init) => {
    capturedUrl = url;
    capturedInit = init;
    return new Response('Bot says hello', { status: 200 });
  }) as typeof fetch;

  try {
    const response = await testBotPost(
      jsonRequest<Parameters<typeof testBotPost>[0]>({
        botName: 'HelperBot',
        prompt: 'Say hello',
      })
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await readJson(response), {
      response: 'Bot says hello',
      status: 'success',
    });
    assert.equal(String(capturedUrl), 'https://poe.com/HelperBot');
    assert.ok(capturedInit);
    assert.equal(capturedInit.method, 'POST');
    assert.ok(capturedInit.signal instanceof AbortSignal);

    const headers = capturedInit.headers as Record<string, string>;
    assert.equal(headers['Content-Type'], 'application/json');
    assert.equal(typeof capturedInit.body, 'string');

    const requestBody = JSON.parse(capturedInit.body as string);
    assert.equal(typeof requestBody.chatId, 'string');
    assert.deepEqual(
      { ...requestBody, chatId: '<dynamic>' },
      {
        query: 'Say hello',
        chatId: '<dynamic>',
        source: 'chat',
        withChatBreak: false,
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function runChunkSessionBotBindingAssertion() {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;

  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(sampleHtml, { status: 200 });
  }) as typeof fetch;

  try {
    const sessionId = 'bot-binding-session';
    const initialResponse = await chunkedAnalyzeBotPost(
      jsonRequest<Parameters<typeof chunkedAnalyzeBotPost>[0]>({
        botName: 'HelperBot',
        apiKey: 'test-key',
        chunk: 0,
        sessionId,
      })
    );

    assert.equal(initialResponse.status, 200);
    await initialResponse.text();
    assert.equal(fetchCount, 1);

    const continuationResponse = await chunkedAnalyzeBotPost(
      jsonRequest<Parameters<typeof chunkedAnalyzeBotPost>[0]>({
        botName: 'HelperBot',
        apiKey: 'test-key',
        chunk: 0,
        sessionId,
      })
    );

    assert.equal(continuationResponse.status, 200);
    await continuationResponse.text();
    assert.equal(fetchCount, 1);

    const mismatchedResponse = await chunkedAnalyzeBotPost(
      jsonRequest<Parameters<typeof chunkedAnalyzeBotPost>[0]>({
        botName: 'AnotherBot',
        apiKey: 'test-key',
        chunk: 0,
        sessionId,
      })
    );

    assert.equal(mismatchedResponse.status, 409);
    assert.deepEqual(await readJson(mismatchedResponse), {
      error: SESSION_BOT_MISMATCH_ERROR,
    });
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function runFailedChunkSessionCleanupAssertion() {
  const originalFetch = globalThis.fetch;
  const originalTextEncoder = globalThis.TextEncoder;
  let fetchCount = 0;

  class FailingTextEncoder {
    encode(): Uint8Array {
      throw new Error('forced terminal stream failure');
    }
  }

  try {
    globalThis.TextEncoder = FailingTextEncoder as unknown as typeof TextEncoder;
    const sessionId = 'failed-stream-reuse-session';
    const failedResponse = await chunkedAnalyzeBotPost(
      jsonRequest<Parameters<typeof chunkedAnalyzeBotPost>[0]>({
        botName: 'HelperBot',
        apiKey: 'test-key',
        chunk: 0,
        sessionId,
      })
    );

    assert.equal(failedResponse.status, 200);
    assert.equal(await failedResponse.text(), '');

    globalThis.TextEncoder = originalTextEncoder;
    globalThis.fetch = (async () => {
      fetchCount += 1;
      return Response.json({
        choices: [{ message: { content: 'Please try a supported format instead.' } }],
      });
    }) as typeof fetch;

    const reusedResponse = await chunkedAnalyzeBotPost(
      jsonRequest<Parameters<typeof chunkedAnalyzeBotPost>[0]>({
        botName: 'AnotherBot',
        apiKey: 'test-key',
        chunk: 6,
        sessionId,
      })
    );

    assert.equal(reusedResponse.status, 200);
    assert.match(await reusedResponse.text(), /"type":"complete"/);
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.TextEncoder = originalTextEncoder;
  }
}

async function runTestBotTransportFailureAssertions() {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const loggedErrors: string[] = [];

  try {
    console.error = (...args: unknown[]) => loggedErrors.push(args.join(' '));
    globalThis.fetch = (async () => {
      throw new Error('private network path detail');
    }) as typeof fetch;

    const failedResponse = await testBotPost(
      jsonRequest<Parameters<typeof testBotPost>[0]>({
        botName: 'HelperBot',
        prompt: 'Say hello',
      })
    );

    assert.equal(failedResponse.status, 502);
    const failedBody = await readJson(failedResponse);
    assert.deepEqual(failedBody, {
      error: 'Unable to reach Poe bot',
    });

    const timeoutError = new Error('private timeout detail');
    timeoutError.name = 'TimeoutError';
    globalThis.fetch = (async () => {
      throw timeoutError;
    }) as typeof fetch;

    const timeoutResponse = await testBotPost(
      jsonRequest<Parameters<typeof testBotPost>[0]>({
        botName: 'HelperBot',
        prompt: 'Say hello',
      })
    );

    assert.equal(timeoutResponse.status, 504);
    const timeoutBody = await readJson(timeoutResponse);
    assert.deepEqual(timeoutBody, {
      error: 'Poe bot request timed out',
    });
    assert.deepEqual(loggedErrors, [
      'Poe bot request failed',
      'Poe bot request timed out',
    ]);
    assert.doesNotMatch(JSON.stringify(failedBody), /private/);
    assert.doesNotMatch(JSON.stringify(timeoutBody), /private/);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
}

async function main() {
  await runRequestBodyAssertions();
  await runRouteAssertions();
  await runChunkSessionBotBindingAssertion();
  await runFailedChunkSessionCleanupAssertion();
  await runTestBotSuccessAssertion();
  await runTestBotTransportFailureAssertions();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

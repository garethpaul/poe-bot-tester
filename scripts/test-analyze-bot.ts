import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { POST as analyzeBotPost } from '../src/app/api/analyze-bot/route';
import { POST as chunkedAnalyzeBotPost } from '../src/app/api/analyze-bot-chunked/route';
import { POST as streamAnalyzeBotPost } from '../src/app/api/analyze-bot-stream/route';
import {
  analyzeBotName,
  analyzeDescription,
  parseBotPage,
} from '../src/app/api/analyze-bot/scoring';
import {
  INVALID_POE_BOT_NAME_ERROR,
  normalizePoeBotName,
  normalizeRequiredText,
} from '../src/app/api/poe-bot-name';
import { POST as testBotPost } from '../src/app/api/test-bot/route';

function readProjectFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function jsonRequest<T>(payload: unknown): T {
  return { json: async () => payload } as T;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
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

const sparseDescriptionResults = analyzeDescription({ ...metadata, description: 'short' });
assert.deepEqual(
  sparseDescriptionResults.map(result => [result.status, result.score]),
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
const security = readProjectFile('SECURITY.md');
const checkPlan = readProjectFile('docs/plans/2026-06-08-poe-bot-tester-check-wrapper.md');
const vision = readProjectFile('VISION.md');
const descriptionScorePlan = readProjectFile('docs/plans/2026-06-09-poe-bot-tester-description-score-alignment.md');
const streamAnalyzerSource = readProjectFile('src/app/api/analyze-bot-stream/bot-analyzer.ts');
const poeBotNameSource = readProjectFile('src/app/api/poe-bot-name.ts');
const blankInputPlan = readProjectFile('docs/plans/2026-06-09-poe-bot-tester-blank-input-validation.md');

assert.match(makefile, /^check: verify$/m);
assert.match(makefile, /\$\(NPM\) run verify/);
assert.match(readme, /make check/);
assert.match(changes, /make check/);
assert.match(checkPlan, /Completed/);
assert.match(checkPlan, /make check/);
assert.match(checkPlan, /npm run verify/);
assert.match(readme, /description scoring/);
assert.match(changes, /description scoring/);
assert.match(vision, /description scoring/);
assert.match(descriptionScorePlan, /status: completed/);
assert.match(descriptionScorePlan, /parameter/);
assert.match(descriptionScorePlan, /cannot/);
assert.match(descriptionScorePlan, /npm test/);
assert.match(streamAnalyzerSource, /hasAdvancedDocs/);
assert.match(streamAnalyzerSource, /hasLimitations/);
assert.match(poeBotNameSource, /normalizeRequiredText/);
assert.match(readme, /blank API keys and prompts/);
assert.match(changes, /blank API keys and prompts/);
assert.match(security, /blank API keys and prompts/);
assert.match(vision, /blank API keys and prompts/);
assert.match(blankInputPlan, /status: completed/);
assert.match(blankInputPlan, /normalizeRequiredText/);
assert.match(blankInputPlan, /npm test/);

async function runRouteAssertions() {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called for invalid route payloads');
  }) as typeof fetch;

  try {
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

async function main() {
  await runRouteAssertions();
  await runTestBotSuccessAssertion();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

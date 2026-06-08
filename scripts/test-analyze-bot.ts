import assert from 'node:assert/strict';

import { POST as analyzeBotPost } from '../src/app/api/analyze-bot/route';
import {
  analyzeBotName,
  analyzeDescription,
  parseBotPage,
} from '../src/app/api/analyze-bot/scoring';
import { POST as testBotPost } from '../src/app/api/test-bot/route';

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

    const testBotMissingPrompt = await testBotPost(
      jsonRequest<Parameters<typeof testBotPost>[0]>({ botName: 'HelperBot' })
    );
    assert.equal(testBotMissingPrompt.status, 400);
    assert.deepEqual(await readJson(testBotMissingPrompt), {
      error: 'Bot name and prompt are required',
    });

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

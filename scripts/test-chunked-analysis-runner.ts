import assert from 'node:assert/strict';

import { createChunkedAnalysisRunner } from '../src/app/chunked-analysis-runner';
import type { ProgressUpdate } from '../src/app/chunked-analysis-runner';

async function main(): Promise<void> {
  const fetchBodies: Array<Record<string, unknown>> = [];
  const scheduledRetries: Array<() => Promise<void>> = [];
  const runningStates: boolean[] = [];
  const retryMessages: string[] = [];
  const progressUpdates: ProgressUpdate[] = [];
  let consumeCalls = 0;

  const runner = createChunkedAnalysisRunner({
    botName: 'HelperBot',
    apiKey: 'test-key',
    fetchImpl: async (_url, init) => {
      assert.equal(init?.method, 'POST');
      assert.equal(typeof init?.body, 'string');
      fetchBodies.push(JSON.parse(init.body as string));
      return new Response(new ReadableStream<Uint8Array>());
    },
    consumeStream: async (_reader, onUpdate) => {
      consumeCalls += 1;
      if (consumeCalls === 1) {
        onUpdate({
          type: 'progress',
          sessionId: 'learned-session',
          message: 'server assigned session',
        });
        throw new Error('dropped stream after session id');
      }

      return false;
    },
    schedule: callback => {
      scheduledRetries.push(callback);
    },
    log: () => undefined,
    onProgressUpdate: update => {
      progressUpdates.push(update);
    },
    setIsRunning: isRunning => {
      runningStates.push(isRunning);
    },
    setRetryMessage: message => {
      retryMessages.push(message);
    },
    onError: message => {
      throw new Error(`unexpected error: ${message}`);
    },
  });

  await runner(0, null);

  assert.equal(fetchBodies.length, 1);
  assert.equal(fetchBodies[0].sessionId, null);
  assert.equal(scheduledRetries.length, 1);
  assert.deepEqual(
    progressUpdates.map(update => update.sessionId),
    ['learned-session'],
  );
  assert.match(retryMessages.at(-1) ?? '', /retrying in 1s/);

  await scheduledRetries[0]();

  assert.equal(fetchBodies.length, 2);
  assert.equal(fetchBodies[1].sessionId, 'learned-session');
  assert.equal(fetchBodies[1].chunk, 0);
  assert.deepEqual(runningStates, [false]);

  console.log('Chunked analysis runner retry tests passed.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

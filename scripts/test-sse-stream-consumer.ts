import assert from 'node:assert/strict';

import {
  consumeSseStream,
  type SseStreamReader,
} from '../src/app/sse-stream-consumer';

const encoder = new TextEncoder();

class FakeReader implements SseStreamReader {
  private index = 0;
  cancelCalls = 0;
  events: string[] = [];
  readCalls = 0;
  releaseCalls = 0;

  constructor(
    private readonly chunks: Uint8Array[],
    private readonly readError?: Error,
    private readonly cancelError?: Error,
  ) {}

  async read(): Promise<ReadableStreamReadResult<Uint8Array>> {
    this.readCalls += 1;
    if (this.readError) throw this.readError;
    if (this.index >= this.chunks.length) return { done: true, value: undefined };
    return { done: false, value: this.chunks[this.index++] };
  }

  async cancel(): Promise<void> {
    this.cancelCalls += 1;
    this.events.push('cancel');
    if (this.cancelError) throw this.cancelError;
  }

  releaseLock(): void {
    this.releaseCalls += 1;
    this.events.push('release');
  }
}

async function main(): Promise<void> {
  const terminalReader = new FakeReader([
  encoder.encode('data: {"type":"progress"}\n\ndata: {"type":"complete"}\n\n'),
  encoder.encode('data: {"type":"late"}\n\n'),
]);
  const terminalUpdates: string[] = [];
  assert.equal(await consumeSseStream<{ type: string }>(terminalReader, update => {
    terminalUpdates.push(update.type);
    return update.type === 'complete';
  }), true);
  assert.deepEqual(terminalUpdates, ['progress', 'complete']);
  assert.equal(terminalReader.readCalls, 1);
  assert.equal(terminalReader.cancelCalls, 1);
  assert.equal(terminalReader.releaseCalls, 1);
  assert.deepEqual(terminalReader.events, ['cancel', 'release']);

  const eofReader = new FakeReader([
  encoder.encode('data: {"type":"progress"}\n\n'),
]);
  assert.equal(await consumeSseStream(eofReader, () => false), false);
  assert.equal(eofReader.cancelCalls, 0);
  assert.equal(eofReader.releaseCalls, 1);

  const cancelFailureReader = new FakeReader([
  encoder.encode('data: {"type":"complete"}\n\n'),
], undefined, new Error('cancel failed'));
  assert.equal(await consumeSseStream<{ type: string }>(
    cancelFailureReader,
    update => update.type === 'complete',
  ), true);
  assert.equal(cancelFailureReader.cancelCalls, 1);
  assert.equal(cancelFailureReader.releaseCalls, 1);
  assert.deepEqual(cancelFailureReader.events, ['cancel', 'release']);

  const readFailureReader = new FakeReader([], new Error('read failed'));
  await assert.rejects(
    consumeSseStream(readFailureReader, () => false),
    /read failed/,
  );
  assert.equal(readFailureReader.releaseCalls, 1);

  const callbackFailureReader = new FakeReader([
  encoder.encode('data: {"type":"progress"}\n\n'),
]);
  await assert.rejects(
    consumeSseStream(callbackFailureReader, () => {
      throw new Error('callback failed');
    }),
    /callback failed/,
  );
  assert.equal(callbackFailureReader.releaseCalls, 1);

  console.log('SSE stream consumer lifecycle tests passed.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

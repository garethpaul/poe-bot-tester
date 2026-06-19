import assert from 'node:assert/strict';

import { SseDataDecoder } from '../src/app/sse-data-decoder';

const payload = {
  type: 'progress',
  message: 'Résumé ready',
  progress: 50,
};
const record = `data: ${JSON.stringify(payload)}\n\n`;

for (let split = 1; split < record.length; split += 1) {
  const decoder = new SseDataDecoder();
  const decoded = [
    ...decoder.push(record.slice(0, split)),
    ...decoder.push(record.slice(split)),
    ...decoder.finish(),
  ];
  assert.deepEqual(decoded, [payload]);
}

const encodedRecord = new TextEncoder().encode(record);
for (let split = 1; split < encodedRecord.length; split += 1) {
  const textDecoder = new TextDecoder();
  const sseDecoder = new SseDataDecoder();
  const decoded = [
    ...sseDecoder.push(textDecoder.decode(encodedRecord.slice(0, split), { stream: true })),
    ...sseDecoder.push(textDecoder.decode(encodedRecord.slice(split), { stream: true })),
    ...sseDecoder.push(textDecoder.decode()),
    ...sseDecoder.finish(),
  ];
  assert.deepEqual(decoded, [payload]);
}

const multiple = new SseDataDecoder();
assert.deepEqual(
  multiple.push('event: progress\r\ndata: {"type":"progress","progress":25}\r\n\r\ndata: {"type":"chunk_complete","nextChunk":2}\n\n'),
  [
    { type: 'progress', progress: 25 },
    { type: 'chunk_complete', nextChunk: 2 },
  ],
);

const malformed = new SseDataDecoder();
assert.deepEqual(
  malformed.push('data: {\nretry: 1000\ndata: \ndata: null\ndata: "text"\ndata: []\ndata: {"type":"complete"}\n\n'),
  [{ type: 'complete' }],
);

const trailing = new SseDataDecoder();
assert.deepEqual(trailing.push('data: {"type":"complete"}'), []);
assert.deepEqual(trailing.finish(), [{ type: 'complete' }]);

const incomplete = new SseDataDecoder();
assert.deepEqual(incomplete.push('data: {"type":"progress"'), []);
assert.deepEqual(incomplete.finish(), []);

console.log('SSE data decoder tests passed.');

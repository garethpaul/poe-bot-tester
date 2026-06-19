import { SseDataDecoder } from './sse-data-decoder';

export interface SseStreamReader {
  read(): Promise<ReadableStreamReadResult<Uint8Array>>;
  cancel(): Promise<void>;
  releaseLock(): void;
}

export async function consumeSseStream<T extends object>(
  reader: SseStreamReader,
  onUpdate: (update: T) => boolean,
): Promise<boolean> {
  const decoder = new TextDecoder();
  const sseDecoder = new SseDataDecoder<T>();

  const processUpdates = async (updates: T[]): Promise<boolean> => {
    for (const update of updates) {
      if (onUpdate(update)) {
        try {
          await reader.cancel();
        } catch {
          // Terminal state is authoritative even if transport cancellation fails.
        }
        return true;
      }
    }
    return false;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        const finalUpdates = [
          ...sseDecoder.push(decoder.decode()),
          ...sseDecoder.finish(),
        ];
        const completed = await processUpdates(finalUpdates);
        return completed;
      }

      const updates = sseDecoder.push(decoder.decode(value, { stream: true }));
      if (await processUpdates(updates)) {
        return true;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

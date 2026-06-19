import {
  consumeSseStream,
  type SseStreamReader,
} from './sse-stream-consumer';

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'running';
  details?: string;
  score?: number;
  error?: string;
  debugInfo?: {
    request?: string;
    response?: string;
    timestamp?: string;
    duration?: number;
    expectedBehavior?: string;
    actualBehavior?: string;
  };
}

export interface BotScorecard {
  botName: string;
  overallScore: number;
  categories: {
    branding: TestResult[];
    functionality: TestResult[];
    usability: TestResult[];
    fileSupport: TestResult[];
    errorHandling: TestResult[];
  };
  responseTime?: number;
}

export interface ProgressUpdate {
  type: string;
  category?: string;
  testName?: string;
  message?: string;
  result?: unknown;
  progress?: number;
  currentTest?: number;
  totalTests?: number;
  sessionId?: string;
  nextChunk?: number;
}

type ConsumeStream = (
  reader: SseStreamReader,
  onUpdate: (update: ProgressUpdate) => boolean,
) => Promise<boolean>;

interface ChunkedAnalysisRunnerOptions {
  botName: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  consumeStream?: ConsumeStream;
  schedule?: (callback: () => Promise<void>, delayMs: number) => unknown;
  log?: (message: string, error: unknown) => void;
  maxRetries?: number;
  onProgressUpdate: (update: ProgressUpdate) => void;
  setIsRunning: (isRunning: boolean) => void;
  setRetryMessage: (message: string) => void;
  onError: (message: string) => void;
}

export function createChunkedAnalysisRunner({
  botName,
  apiKey,
  fetchImpl = globalThis.fetch,
  consumeStream = consumeSseStream,
  schedule = (callback, delayMs) => setTimeout(() => {
    void callback();
  }, delayMs),
  log = (message, error) => console.log(message, error),
  maxRetries = 3,
  onProgressUpdate,
  setIsRunning,
  setRetryMessage,
  onError,
}: ChunkedAnalysisRunnerOptions) {
  return async function runChunkedAnalysis(
    chunkIndex: number,
    sessionId: string | null,
    retryCount = 0,
  ): Promise<void> {
    let currentSessionId = sessionId;

    try {
      const response = await fetchImpl('/api/analyze-bot-chunked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botName,
          apiKey,
          chunk: chunkIndex,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let nextChunk: number | null = null;

      const processUpdate = (data: ProgressUpdate): boolean => {
        if (data.sessionId && !currentSessionId) {
          currentSessionId = data.sessionId;
        }

        if (data.type === 'chunk_complete' && data.nextChunk !== undefined) {
          nextChunk = data.nextChunk;
        }

        onProgressUpdate(data);

        if (data.type === 'complete') {
          setIsRunning(false);
          return true;
        }

        return false;
      };

      if (await consumeStream(reader, processUpdate)) return;

      if (nextChunk !== null) {
        const scheduledChunk = nextChunk;
        const scheduledSessionId = currentSessionId;
        schedule(() => runChunkedAnalysis(scheduledChunk, scheduledSessionId), 1000);
      } else {
        setIsRunning(false);
      }
    } catch (error) {
      log(`Chunk ${chunkIndex} failed (attempt ${retryCount + 1}):`, error);

      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        setRetryMessage(
          `Connection lost, retrying in ${delay / 1000}s... (attempt ${retryCount + 1}/${maxRetries})`,
        );

        const retrySessionId = currentSessionId;
        schedule(
          () => runChunkedAnalysis(chunkIndex, retrySessionId, retryCount + 1),
          delay,
        );
      } else {
        onError(`Analysis failed after ${maxRetries} retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsRunning(false);
      }
    }
  };
}

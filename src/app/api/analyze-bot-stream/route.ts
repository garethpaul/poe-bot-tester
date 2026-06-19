import { NextRequest } from 'next/server';

import {
  INVALID_POE_BOT_NAME_ERROR,
  normalizePoeBotName,
  normalizeRequiredText,
} from '../poe-bot-name';
import {
  INVALID_JSON_BODY_ERROR,
  JSON_BODY_TOO_LARGE_ERROR,
  parseJsonObject,
} from '../request-body';

interface ProgressUpdate {
  type: 'progress' | 'test_start' | 'test_complete' | 'category_start' | 'category_complete' | 'complete' | 'error';
  category?: string;
  testName?: string;
  message?: string;
  result?: unknown;
  progress?: number;
  totalTests?: number;
  currentTest?: number;
}

// Import the analysis functions from the main analyze-bot route
// We'll need to refactor them to accept a progress callback

async function sendProgress(controller: ReadableStreamDefaultController<Uint8Array>, update: ProgressUpdate) {
  const data = `data: ${JSON.stringify(update)}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

export async function POST(request: NextRequest) {
  const parsedBody = await parseJsonObject(request);
  if (!parsedBody.ok) {
    const oversized = parsedBody.reason === 'too_large';
    return new Response(
      oversized ? JSON_BODY_TOO_LARGE_ERROR : INVALID_JSON_BODY_ERROR,
      { status: oversized ? 413 : 400 }
    );
  }
  const body = parsedBody.value;

  const { botName: rawBotName, apiKey: rawApiKey } = body;
  const apiKey = normalizeRequiredText(rawApiKey);

  if (!rawBotName || !apiKey) {
    return new Response('Bot name and API key are required', { status: 400 });
  }

  const botName = normalizePoeBotName(rawBotName);
  if (!botName) {
    return new Response(INVALID_POE_BOT_NAME_ERROR, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await sendProgress(controller, {
          type: 'progress',
          message: 'Starting bot analysis...',
          progress: 0,
          totalTests: 25, // Approximate total number of tests
          currentTest: 0
        });

        // Import analysis functions dynamically to avoid circular dependencies
        const { analyzeBot } = await import('./bot-analyzer');
        
        const result = await analyzeBot(botName, apiKey, async (update: ProgressUpdate) => {
          await sendProgress(controller, update);
        });

        await sendProgress(controller, {
          type: 'complete',
          result,
          progress: 100,
          message: 'Analysis complete!'
        });

      } catch (error) {
        await sendProgress(controller, {
          type: 'error',
          message: error instanceof Error ? error.message : 'Analysis failed'
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

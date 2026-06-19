import { NextRequest, NextResponse } from 'next/server';

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

export const runtime = 'edge';

function isPoeTimeoutError(error: unknown): boolean {
  return error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError');
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await parseJsonObject(request);
    if (!parsedBody.ok) {
      const oversized = parsedBody.reason === 'too_large';
      return NextResponse.json(
        { error: oversized ? JSON_BODY_TOO_LARGE_ERROR : INVALID_JSON_BODY_ERROR },
        { status: oversized ? 413 : 400 }
      );
    }
    const body = parsedBody.value;

    const { botName: rawBotName, prompt: rawPrompt } = body;
    const prompt = normalizeRequiredText(rawPrompt);

    if (!rawBotName || !prompt) {
      return NextResponse.json(
        { error: 'Bot name and prompt are required' },
        { status: 400 }
      );
    }

    const botName = normalizePoeBotName(rawBotName);
    if (!botName) {
      return NextResponse.json(
        { error: INVALID_POE_BOT_NAME_ERROR },
        { status: 400 }
      );
    }

    const response = await fetch(`https://poe.com/${botName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Poe-Bot-Tester/1.0',
      },
      body: JSON.stringify({
        query: prompt,
        chatId: Math.random().toString(36).substring(7),
        source: 'chat',
        withChatBreak: false
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Bot responded with status: ${response.status}`;
      
      if (response.status === 404) {
        errorMessage = `Bot "${botName}" not found. Please check the bot name.`;
      } else if (response.status === 403) {
        errorMessage = `Access denied to bot "${botName}". Bot may be private or require authentication.`;
      } else if (errorText) {
        errorMessage = errorText;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.text();
    
    return NextResponse.json({
      response: data,
      status: 'success'
    });

  } catch (error) {
    if (isPoeTimeoutError(error)) {
      console.error('Poe bot request timed out');
      return NextResponse.json(
        { error: 'Poe bot request timed out' },
        { status: 504 }
      );
    }

    console.error('Poe bot request failed');
    return NextResponse.json(
      { error: 'Unable to reach Poe bot' },
      { status: 502 }
    );
  }
}

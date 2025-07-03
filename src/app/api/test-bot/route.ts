import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface TestBotRequest {
  botName: string;
  prompt: string;
}

export async function POST(request: NextRequest) {
  try {
    const { botName, prompt }: TestBotRequest = await request.json();

    if (!botName || !prompt) {
      return NextResponse.json(
        { error: 'Bot name and prompt are required' },
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
    console.error('Bot test error:', error);
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timeout - bot took too long to respond' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
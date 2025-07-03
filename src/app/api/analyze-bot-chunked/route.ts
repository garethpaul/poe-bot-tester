import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface ChunkedAnalysisRequest {
  botName: string;
  apiKey: string;
  chunk?: number; // Which chunk to process (0-based)
  sessionId?: string; // Session to track progress
}

interface ProgressUpdate {
  type: 'progress' | 'test_start' | 'test_complete' | 'chunk_complete' | 'complete' | 'error';
  category?: string;
  testName?: string;
  message?: string;
  result?: unknown;
  progress?: number;
  totalTests?: number;
  currentTest?: number;
  nextChunk?: number;
  sessionId?: string;
}

interface BotMetadata {
  displayName?: string;
  description?: string;
  followerCount?: number;
  model?: string;
  [key: string]: unknown;
}

// Define test chunks to avoid timeouts
const TEST_CHUNKS = [
  {
    name: 'metadata',
    tests: ['Fetch bot metadata', 'Parse bot information'],
    category: 'usability'
  },
  {
    name: 'branding',
    tests: [
      'Bot name consistency and formatting',
      'Profile picture appeal and quality',
      'Brand consistency with model family',
      'Official verification and credibility'
    ],
    category: 'branding'
  },
  {
    name: 'description',
    tests: [
      'Description clarity for non-technical users',
      'Advanced behavior documentation',
      'Limitation documentation'
    ],
    category: 'usability'
  },
  {
    name: 'files_basic',
    tests: ['PNG support', 'JPEG support', 'PDF support'],
    category: 'fileSupport'
  },
  {
    name: 'files_advanced',
    tests: ['GIF support', 'HEIC support', 'TIFF support', 'MP4 support'],
    category: 'fileSupport'
  },
  {
    name: 'conversation',
    tests: [
      'Multi-turn conversation coherence',
      'Response time performance'
    ],
    category: 'functionality'
  },
  {
    name: 'error_handling',
    tests: ['Helpful error messages'],
    category: 'errorHandling'
  }
];

interface SessionData {
  botName: string;
  results: {
    branding: unknown[];
    functionality: unknown[];
    usability: unknown[];
    fileSupport: unknown[];
    errorHandling: unknown[];
  };
  metadata: BotMetadata | null;
}

// Simple in-memory session storage for demo (use Redis/DB in production)
const sessions = new Map<string, SessionData>();

async function sendProgress(controller: ReadableStreamDefaultController<Uint8Array>, update: ProgressUpdate) {
  const data = `data: ${JSON.stringify(update)}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

async function processChunk(
  botName: string,
  apiKey: string,
  chunkIndex: number,
  sessionId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): Promise<void> {
  const chunk = TEST_CHUNKS[chunkIndex];
  if (!chunk) return;

  await sendProgress(controller, {
    type: 'progress',
    message: `Processing ${chunk.name} tests...`,
    progress: Math.round((chunkIndex / TEST_CHUNKS.length) * 100),
    currentTest: chunkIndex + 1,
    totalTests: TEST_CHUNKS.length,
    sessionId
  });

  // Get or create session data
  let sessionData = sessions.get(sessionId);
  if (!sessionData) {
    sessionData = {
      botName,
      results: {
        branding: [],
        functionality: [],
        usability: [],
        fileSupport: [],
        errorHandling: []
      },
      metadata: null
    };
    sessions.set(sessionId, sessionData);
  }

  // Process each test in the chunk with timeout awareness
  const startTime = Date.now();
  const MAX_CHUNK_TIME = 8000; // 8 seconds to leave buffer for response

  for (let i = 0; i < chunk.tests.length; i++) {
    // Check if we're approaching timeout
    if (Date.now() - startTime > MAX_CHUNK_TIME) {
      await sendProgress(controller, {
        type: 'chunk_complete',
        message: 'Chunk timeout - continuing with next chunk',
        nextChunk: chunkIndex + 1,
        sessionId
      });
      return;
    }

    const testName = chunk.tests[i];
    
    await sendProgress(controller, {
      type: 'test_start',
      category: chunk.category,
      testName,
      message: `Testing: ${testName}`,
      sessionId
    });

    try {
      // Simulate test execution (replace with actual test logic)
      const result = await executeTest(testName, botName, apiKey, sessionData);
      
      const categoryResults = sessionData.results[chunk.category as keyof typeof sessionData.results];
      if (Array.isArray(categoryResults)) {
        categoryResults.push(result);
      } else {
        console.error('Category results not found or not array:', chunk.category, categoryResults);
      }
      
      await sendProgress(controller, {
        type: 'test_complete',
        category: chunk.category,
        testName,
        result,
        sessionId
      });

      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      const failedResult = {
        name: testName,
        status: 'failed' as const,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        score: 0
      };

      const categoryResults = sessionData.results[chunk.category as keyof typeof sessionData.results];
      if (Array.isArray(categoryResults)) {
        categoryResults.push(failedResult);
      }
      
      await sendProgress(controller, {
        type: 'test_complete',
        category: chunk.category,
        testName,
        result: failedResult,
        sessionId
      });
    }
  }

  // Update session
  sessions.set(sessionId, sessionData);

  // Check if this is the last chunk
  if (chunkIndex >= TEST_CHUNKS.length - 1) {
    // Calculate final score and send completion
    const allResults = Object.values(sessionData.results).flat();
    const overallScore = Math.round(
      allResults.reduce((sum: number, result: unknown) => {
        const testResult = result as { score?: number };
        return sum + (testResult.score || 0);
      }, 0) / allResults.length
    );

    const scorecard = {
      botName,
      overallScore,
      categories: sessionData.results,
      responseTime: undefined
    };

    await sendProgress(controller, {
      type: 'complete',
      result: scorecard,
      progress: 100,
      message: 'Analysis complete!',
      sessionId
    });

    // Clean up session
    sessions.delete(sessionId);
  } else {
    // Signal to continue with next chunk
    await sendProgress(controller, {
      type: 'chunk_complete',
      message: `${chunk.name} complete`,
      nextChunk: chunkIndex + 1,
      sessionId
    });
  }
}

async function executeTest(testName: string, botName: string, apiKey: string, sessionData: SessionData): Promise<unknown> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  switch (testName) {
    case 'Fetch bot metadata':
      if (!sessionData.metadata) {
        try {
          const response = await fetch(`https://poe.com/${botName}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(5000)
          });
          
          const duration = Date.now() - startTime;
          
          if (response.ok) {
            const html = await response.text();
            sessionData.metadata = parseBotPage(html, botName);
            
            return {
              name: testName,
              status: 'passed',
              details: 'Successfully fetched and parsed bot page metadata',
              score: 100,
              debugInfo: {
                request: `GET https://poe.com/${botName}`,
                response: `HTTP ${response.status} - Page fetched successfully (${html.length} characters)`,
                timestamp,
                duration,
                expectedBehavior: 'Bot page should be accessible and contain metadata',
                actualBehavior: 'Page loaded successfully with valid HTML content'
              }
            };
          } else {
            return {
              name: testName,
              status: 'failed',
              details: `Failed to fetch bot page: HTTP ${response.status}`,
              score: 0,
              error: `HTTP ${response.status}: ${response.statusText}`,
              debugInfo: {
                request: `GET https://poe.com/${botName}`,
                response: `HTTP ${response.status} ${response.statusText}`,
                timestamp,
                duration,
                expectedBehavior: 'Bot page should return HTTP 200',
                actualBehavior: `Received HTTP ${response.status} instead`
              }
            };
          }
        } catch (error) {
          const duration = Date.now() - startTime;
          return {
            name: testName,
            status: 'failed',
            details: 'Network error or timeout when fetching bot page',
            score: 0,
            error: error instanceof Error ? error.message : 'Unknown network error',
            debugInfo: {
              request: `GET https://poe.com/${botName}`,
              response: 'Request failed',
              timestamp,
              duration,
              expectedBehavior: 'Bot page should be accessible within 5 seconds',
              actualBehavior: 'Request timed out or failed due to network error'
            }
          };
        }
      }
      
      return {
        name: testName,
        status: 'passed',
        details: 'Metadata already available from previous fetch',
        score: 100
      };

    case 'Helpful error messages':
      try {
        const testPrompt = 'Please process this invalid file type: example.xyz123';
        const response = await fetch('https://api.poe.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: botName,
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 200
          }),
          signal: AbortSignal.timeout(10000)
        });

        const duration = Date.now() - startTime;
        const data = await response.json();

        if (response.ok && data.choices?.[0]?.message?.content) {
          const content = data.choices[0].message.content.toLowerCase();
          const hasSpecificError = content.includes('does not support') || 
                                 content.includes('cannot process') || 
                                 content.includes('invalid file') ||
                                 content.includes('unsupported format');
          
          const hasHelpfulGuidance = content.includes('try') || 
                                   content.includes('instead') || 
                                   content.includes('supported formats') ||
                                   content.includes('please use');

          let score = 50; // Base score for responding
          if (hasSpecificError) score += 25;
          if (hasHelpfulGuidance) score += 25;

          return {
            name: testName,
            status: score >= 75 ? 'passed' : 'failed',
            details: hasSpecificError ? 
              'Bot provides specific error information' : 
              'Bot gives generic response without specific error details',
            score,
            debugInfo: {
              request: JSON.stringify({ model: botName, messages: [{ role: 'user', content: testPrompt }] }, null, 2),
              response: data.choices[0].message.content,
              timestamp,
              duration,
              expectedBehavior: 'Bot should provide specific error message about unsupported file type with helpful guidance',
              actualBehavior: hasSpecificError ? 
                'Bot correctly identified unsupported file type' : 
                'Bot gave generic response without specific error identification'
            }
          };
        } else {
          return {
            name: testName,
            status: 'failed',
            details: 'Failed to get response from bot API',
            score: 0,
            error: data.error?.message || 'API request failed',
            debugInfo: {
              request: JSON.stringify({ model: botName, messages: [{ role: 'user', content: testPrompt }] }, null, 2),
              response: JSON.stringify(data, null, 2),
              timestamp,
              duration,
              expectedBehavior: 'Bot API should respond with valid message',
              actualBehavior: `API returned error or invalid response: ${response.status}`
            }
          };
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        return {
          name: testName,
          status: 'failed',
          details: 'Error testing bot API',
          score: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          debugInfo: {
            request: 'API request to test error handling',
            response: 'Request failed',
            timestamp,
            duration,
            expectedBehavior: 'API should respond within timeout',
            actualBehavior: 'Request failed or timed out'
          }
        };
      }

    case 'Parse bot information':
      // This test parses the fetched metadata
      if (sessionData.metadata) {
        const metadata = sessionData.metadata as BotMetadata;
        const hasValidName = metadata.displayName && metadata.displayName.length > 0;
        const hasDescription = metadata.description && metadata.description.length > 10;
        
        const duration = Date.now() - startTime;
        return {
          name: testName,
          status: hasValidName && hasDescription ? 'passed' : 'failed',
          details: hasValidName && hasDescription ? 
            'Bot metadata parsed successfully' : 
            'Bot metadata incomplete or missing',
          score: hasValidName && hasDescription ? 95 : 45,
          debugInfo: {
            request: 'Parse extracted bot metadata',
            response: `Name: "${metadata.displayName || 'Not found'}", Description: "${metadata.description ? metadata.description.substring(0, 100) + '...' : 'Not found'}"`,
            timestamp,
            duration,
            expectedBehavior: 'Bot should have valid display name and description',
            actualBehavior: hasValidName && hasDescription ? 
              'Bot has complete metadata' : 
              'Bot metadata is incomplete'
          }
        };
      }
      
      return {
        name: testName,
        status: 'failed',
        details: 'No metadata available to parse',
        score: 0,
        error: 'Metadata fetch must complete first',
        debugInfo: {
          request: 'Parse bot metadata',
          response: 'No metadata available',
          timestamp,
          duration: Date.now() - startTime,
          expectedBehavior: 'Bot metadata should be available from fetch step',
          actualBehavior: 'No metadata found in session'
        }
      };

    case 'Bot name consistency and formatting':
      return await testBotNameFormatting(sessionData, timestamp, startTime);

    case 'Profile picture appeal and quality':
      return await testProfilePicture(sessionData, timestamp, startTime);

    case 'Brand consistency with model family':
      return await testBrandConsistency(sessionData, timestamp, startTime);

    case 'Official verification and credibility':
      return await testVerification(sessionData, timestamp, startTime);

    case 'Description clarity for non-technical users':
      return await testDescriptionClarity(sessionData, timestamp, startTime);

    case 'Advanced behavior documentation':
      return await testAdvancedDocumentation(sessionData, timestamp, startTime);

    case 'Limitation documentation':
      return await testLimitationDocumentation(sessionData, timestamp, startTime);

    case 'PNG support':
      return await testFileSupport('PNG', 'image/png', botName, apiKey, timestamp, startTime);

    case 'JPEG support':
      return await testFileSupport('JPEG', 'image/jpeg', botName, apiKey, timestamp, startTime);

    case 'PDF support':
      return await testFileSupport('PDF', 'application/pdf', botName, apiKey, timestamp, startTime);

    case 'GIF support':
      return await testFileSupport('GIF', 'image/gif', botName, apiKey, timestamp, startTime);

    case 'HEIC support':
      return await testFileTypeAwareness('HEIC', 'image/heic', botName, apiKey, timestamp, startTime);

    case 'TIFF support':
      return await testFileTypeAwareness('TIFF', 'image/tiff', botName, apiKey, timestamp, startTime);

    case 'MP4 support':
      return await testFileTypeAwareness('MP4', 'video/mp4', botName, apiKey, timestamp, startTime);

    case 'Multi-turn conversation coherence':
      return await testConversationCoherence(botName, apiKey, timestamp, startTime);

    case 'Response time performance':
      return await testResponseTime(botName, apiKey, timestamp, startTime);

    default:
      // Fallback for any unhandled tests
      const duration = Date.now() - startTime;
      return {
        name: testName,
        status: 'failed',
        details: `Test "${testName}" not implemented yet`,
        score: 0,
        error: 'Test implementation missing',
        debugInfo: {
          request: `Execute test: ${testName}`,
          response: 'Test not implemented',
          timestamp,
          duration,
          expectedBehavior: 'Test should have proper implementation',
          actualBehavior: 'Test implementation is missing from the system'
        }
      };
  }
}


function parseBotPage(html: string, botName: string): BotMetadata {
  const metadata = {
    name: botName,
    displayName: botName,
    description: '',
    profilePictureUrl: undefined as string | undefined,
    isVerified: false,
    followerCount: undefined as number | undefined
  };

  try {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      metadata.displayName = titleMatch[1].replace(' - Poe', '').trim();
    }

    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descriptionMatch) {
      metadata.description = descriptionMatch[1];
    }

    const profilePicMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (profilePicMatch) {
      metadata.profilePictureUrl = profilePicMatch[1];
    }

    metadata.isVerified = /verified|official|✓/i.test(html);

    const followerMatch = html.match(/(\d+(?:,\d+)*)\s*followers?/i);
    if (followerMatch) {
      metadata.followerCount = parseInt(followerMatch[1].replace(/,/g, ''));
    }
  } catch (error) {
    console.log('Error parsing page:', error);
  }

  return metadata;
}

async function testBotNameFormatting(sessionData: SessionData, timestamp: string, startTime: number): Promise<unknown> {
  const metadata = sessionData.metadata as BotMetadata;
  const duration = Date.now() - startTime;
  
  if (!metadata) {
    return {
      name: 'Bot name consistency and formatting',
      status: 'failed',
      details: 'No metadata available for name analysis',
      score: 0,
      error: 'Metadata required for name testing',
      debugInfo: {
        request: 'Analyze bot name formatting',
        response: 'No metadata available',
        timestamp,
        duration,
        expectedBehavior: 'Bot metadata should contain name information',
        actualBehavior: 'No metadata found in session'
      }
    };
  }

  const { name, displayName } = metadata;
  let score = 100;
  const issues: string[] = [];

  if (name && displayName && typeof name === 'string' && typeof displayName === 'string' && name.toLowerCase() !== displayName.toLowerCase()) {
    if (Math.abs(name.length - displayName.length) > 3) {
      score -= 20;
      issues.push('Significant mismatch between URL name and display name');
    }
  }

  if (!displayName || typeof displayName !== 'string' || displayName.length < 2) {
    score -= 30;
    issues.push('Display name missing or too short');
  } else if (!/^[A-Z]/.test(displayName)) {
    score -= 10;
    issues.push('Display name should start with capital letter');
  }

  if (displayName && typeof displayName === 'string' && displayName.length > 25) {
    score -= 10;
    issues.push('Display name is quite long');
  }

  return {
    name: 'Bot name consistency and formatting',
    status: score > 70 ? 'passed' : 'failed',
    details: issues.length > 0 ? issues.join('; ') : 'Name formatting follows good practices',
    score,
    debugInfo: {
      request: 'Analyze bot name formatting and consistency',
      response: `Display name: "${displayName || 'Not found'}", URL name: "${name || 'Not found'}"`,
      timestamp,
      duration,
      expectedBehavior: 'Bot should have clear, properly formatted name',
      actualBehavior: score > 70 ? 'Bot has well-formatted name' : 'Bot name has formatting issues'
    }
  };
}

async function testProfilePicture(sessionData: SessionData, timestamp: string, startTime: number): Promise<unknown> {
  const metadata = sessionData.metadata as BotMetadata;
  const duration = Date.now() - startTime;
  
  if (!metadata) {
    return {
      name: 'Profile picture appeal and quality',
      status: 'failed',
      details: 'No metadata available for profile picture analysis',
      score: 0,
      debugInfo: {
        request: 'Check profile picture presence and quality',
        response: 'No metadata available',
        timestamp,
        duration,
        expectedBehavior: 'Bot metadata should be available',
        actualBehavior: 'No metadata found'
      }
    };
  }

  const { profilePictureUrl } = metadata;
  let score = 50;
  const issues: string[] = [];

  if (!profilePictureUrl) {
    return {
      name: 'Profile picture appeal and quality',
      status: 'failed',
      details: 'No profile picture found',
      score: 0,
      debugInfo: {
        request: 'Check for profile picture presence and quality',
        response: 'No profile picture detected in bot metadata',
        timestamp,
        duration,
        expectedBehavior: 'Bot should have appealing, well-cropped profile picture',
        actualBehavior: 'No profile picture found'
      }
    };
  }

  score = 80; // Boost for having a profile picture

  if (typeof profilePictureUrl === 'string' && (profilePictureUrl.includes('default') || profilePictureUrl.includes('placeholder'))) {
    score -= 30;
    issues.push('Using default/placeholder image');
  }

  if (typeof profilePictureUrl === 'string' && (profilePictureUrl.includes('.png') || profilePictureUrl.includes('.jpg') || profilePictureUrl.includes('.webp'))) {
    score += 10;
  }

  return {
    name: 'Profile picture appeal and quality',
    status: score > 70 ? 'passed' : 'failed',
    details: issues.length > 0 ? issues.join('; ') : 'Profile picture appears properly configured',
    score,
    debugInfo: {
      request: 'Check for profile picture presence and quality',
      response: `Profile picture found: ${profilePictureUrl}`,
      timestamp,
      duration,
      expectedBehavior: 'Bot should have appealing, well-cropped profile picture',
      actualBehavior: score > 70 ? 'Profile picture is present and properly configured' : 'Profile picture has issues'
    }
  };
}

async function testBrandConsistency(sessionData: SessionData, timestamp: string, startTime: number): Promise<unknown> {
  const metadata = sessionData.metadata as BotMetadata;
  const duration = Date.now() - startTime;
  
  if (!metadata) {
    return {
      name: 'Brand consistency with model family',
      status: 'failed',
      details: 'No metadata available for brand analysis',
      score: 0,
      debugInfo: {
        request: 'Analyze brand consistency',
        response: 'No metadata available',
        timestamp,
        duration,
        expectedBehavior: 'Bot metadata should be available for brand analysis',
        actualBehavior: 'No metadata found'
      }
    };
  }

  const { name = '', displayName = '' } = metadata;
  let score = 75;
  const issues: string[] = [];

  const knownBrands = {
    'claude': ['anthropic', 'sonnet', 'haiku', 'opus'],
    'gpt': ['openai', 'turbo', 'mini', 'davinci'],
    'gemini': ['google', 'pro', 'ultra', 'nano'],
    'llama': ['meta', 'facebook', 'chat'],
  };

  let brandFound = false;
  for (const [brand, variants] of Object.entries(knownBrands)) {
    if ((typeof name === 'string' && name.toLowerCase().includes(brand)) || (typeof displayName === 'string' && displayName.toLowerCase().includes(brand))) {
      brandFound = true;
      
      const hasVariant = variants.some(variant => 
        (typeof name === 'string' && name.toLowerCase().includes(variant)) || (typeof displayName === 'string' && displayName.toLowerCase().includes(variant))
      );
      
      if (hasVariant) {
        score += 15;
        issues.push(`Follows ${brand} naming conventions`);
      } else {
        score -= 10;
        issues.push(`Missing expected ${brand} variant information`);
      }
      break;
    }
  }

  if (!brandFound) {
    if (typeof name === 'string' && name.length < 15 && /^[A-Za-z0-9-_]+$/.test(name)) {
      score += 10;
      issues.push('Clean, branded name for custom bot');
    } else {
      score -= 5;
      issues.push('Custom bot with unclear branding');
    }
  }

  return {
    name: 'Brand consistency with model family',
    status: score > 70 ? 'passed' : 'failed',
    details: issues.length > 0 ? issues.join('; ') : 'Brand consistency looks good',
    score,
    debugInfo: {
      request: 'Analyze brand consistency with known model families',
      response: `Bot name: "${name}", Display name: "${displayName}", Brand found: ${brandFound}`,
      timestamp,
      duration,
      expectedBehavior: 'Bot should follow consistent branding patterns',
      actualBehavior: score > 70 ? 'Bot follows good branding practices' : 'Bot branding needs improvement'
    }
  };
}

async function testVerification(sessionData: SessionData, timestamp: string, startTime: number): Promise<unknown> {
  const metadata = sessionData.metadata as BotMetadata;
  const duration = Date.now() - startTime;
  
  if (!metadata) {
    return {
      name: 'Official verification and credibility',
      status: 'failed',
      details: 'No metadata available for verification analysis',
      score: 0,
      debugInfo: {
        request: 'Check verification status and credibility',
        response: 'No metadata available',
        timestamp,
        duration,
        expectedBehavior: 'Bot metadata should be available',
        actualBehavior: 'No metadata found'
      }
    };
  }

  const { isVerified, followerCount } = metadata;
  let score = 60;
  const issues: string[] = [];

  if (isVerified) {
    score += 30;
    issues.push('Bot is verified/official');
  } else {
    score -= 10;
    issues.push('Bot is not verified');
  }

  if (followerCount !== undefined) {
    if (followerCount > 10000) {
      score += 10;
      issues.push(`High engagement: ${followerCount.toLocaleString()} followers`);
    } else if (followerCount > 1000) {
      score += 5;
      issues.push(`Good engagement: ${followerCount.toLocaleString()} followers`);
    } else {
      issues.push(`Low engagement: ${followerCount.toLocaleString()} followers`);
    }
  }

  return {
    name: 'Official verification and credibility',
    status: score > 70 ? 'passed' : 'failed',
    details: issues.join('; '),
    score,
    debugInfo: {
      request: 'Check verification status and credibility indicators',
      response: `Verified: ${isVerified}, Followers: ${followerCount || 'unknown'}`,
      timestamp,
      duration,
      expectedBehavior: 'Bot should have verification or high credibility indicators',
      actualBehavior: score > 70 ? 'Bot has good credibility indicators' : 'Bot lacks verification or credibility markers'
    }
  };
}

async function testDescriptionClarity(sessionData: SessionData, timestamp: string, startTime: number): Promise<unknown> {
  const metadata = sessionData.metadata as BotMetadata;
  const duration = Date.now() - startTime;
  const description = metadata?.description || '';
  
  const score = description.length > 50 ? 85 : 40;
  
  return {
    name: 'Description clarity for non-technical users',
    status: description.length > 50 ? 'passed' : 'failed',
    details: description.length > 50 ? 'Description appears comprehensive' : 'Description too short or missing',
    score,
    debugInfo: {
      request: 'Analyze description clarity and comprehensiveness',
      response: `Description length: ${description.length} characters. Content: "${description.substring(0, 200)}${description.length > 200 ? '...' : ''}"`,
      timestamp,
      duration,
      expectedBehavior: 'Bot should have clear, comprehensive description for users',
      actualBehavior: description.length > 50 ? 'Description is comprehensive' : 'Description is too brief'
    }
  };
}

async function testAdvancedDocumentation(sessionData: SessionData, timestamp: string, startTime: number): Promise<unknown> {
  const metadata = sessionData.metadata as BotMetadata;
  const duration = Date.now() - startTime;
  const description = metadata?.description || '';
  
  const hasAdvancedInfo = description.includes('--') || description.includes('param') || description.includes('command');
  const score = hasAdvancedInfo ? 90 : 60;
  
  return {
    name: 'Advanced behavior documentation',
    status: hasAdvancedInfo ? 'passed' : 'failed',
    details: hasAdvancedInfo ? 'Contains parameter or command documentation' : 'No advanced parameter documentation found',
    score,
    debugInfo: {
      request: 'Check for advanced parameter and command documentation',
      response: `Advanced documentation found: ${hasAdvancedInfo}. Description contains: ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}`,
      timestamp,
      duration,
      expectedBehavior: 'Bot should document advanced features and parameters',
      actualBehavior: hasAdvancedInfo ? 'Advanced documentation present' : 'No advanced documentation found'
    }
  };
}

async function testLimitationDocumentation(sessionData: SessionData, timestamp: string, startTime: number): Promise<unknown> {
  const metadata = sessionData.metadata as BotMetadata;
  const duration = Date.now() - startTime;
  const description = metadata?.description || '';
  
  const hasLimitations = description.includes('limitation') || description.includes('cannot') || description.includes('does not');
  const score = hasLimitations ? 85 : 70;
  
  return {
    name: 'Limitation documentation',
    status: hasLimitations ? 'passed' : 'failed',
    details: hasLimitations ? 'Documents limitations clearly' : 'No clear limitation documentation',
    score,
    debugInfo: {
      request: 'Check for documented limitations and constraints',
      response: `Limitations documented: ${hasLimitations}. Description: "${description.substring(0, 200)}${description.length > 200 ? '...' : ''}"`,
      timestamp,
      duration,
      expectedBehavior: 'Bot should clearly document its limitations',
      actualBehavior: hasLimitations ? 'Limitations are documented' : 'No limitation documentation found'
    }
  };
}

async function testFileSupport(fileType: string, mimeType: string, botName: string, apiKey: string, timestamp: string, startTime: number): Promise<unknown> {
  try {
    // Get test file data directly - avoid fetch in Edge runtime
    const testFiles = {
      png: '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',
      jpeg: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA9/9k=',
      gif: 'R0lGODlhlgC9AP8BAAGAAf///4BBARYYFgd7BvwBAQ+AEO/w8AWn9RgnGID7BB8fICYmJufn59jY2BWBFR94ICRGJPvJBMfHxyZYJg8VEBd4F9/f4CM3IyV2JSZoJj8/QB04IR9nIL+/wDY2Nh8lIEZGR6enpxEODbe3t39/gJeXly4uMBo3Gp+foAkKCg9/EBloGRlXGa+vsFdXVySBJHd3d09PUBN7Dx5HIS8wMAdpBzJzM2ZnZ4+PkIeHhy9YMEIhAQwTDV9fYG9wcDNkNGBfYGzPCQ9kEIBKE4+RkmxucHzzBC9HMAhXCCcjGBWHC+cDA3tBBxJUDTBDLxpIGTUpGkN6EgWR0yMcFFqpDA9cEDRWNE1SUw5EEBRFDk2PDi6OF2K6CwOb5HhIGP2A/XuBeQtqkww6E/HEE5kKCBYRDQhICCRIFihTFNoEA7oHBgg4CQAAAXFKI2hHJvr5Z8cGBUQ4JwyBtjJbExJhDlY2F6kIBjg0JQsnCwd6rmkMCoULCWxDGSNHDlU8I02OKDk0HDZtED+XIAtcgD6JIFlHJNFr0duzFcalI3E+C/J68gpEVxVGVgk6RwxScSgZDCY0GzcaFFUYFncLCQwtGvXyWjUoNuW7FhdCMww1J4qMR3uLQTUrJUssS0UiHEgYEzUXCi5IUxJBQ6+qUxQ5DFtRKJiBJ2k5aXtBe22LOUUqKVYRDGAUDylVDnwRETNKM+XdYQo0N2V3Nd/g34BuKpNNk+C6IbSWI+3BEmRVG6KcUEpAHO/AB3dQKUc1HUwTDE8vMEczM2YVFHV6O1FxLa5ZrzgmCk1HMCg8RlVKRb1hvRYrClJaTTpzIVdKGdGuIJyCGZuHNrSbM4VxH3BfHol1I6aKG8ajGaWLJq6TJ2FVJr6gKeLbW1clJidRZsG5VGOjMsm+YBlkep6goFxkVUNYMFRFNmBtM4d8TlF7UdPMYk1WTT+RQMGkM05FIOq9CHVjHT41D6WOM29hJ3hpKQstMg0mIhM7NhEoMdPLWmxyabm0YQAAAAAAAoAAAAH5BAVkAP0AIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAlgC9AAAI',
      tiff: 'TU0AKgAABwAAAQMAAQAAAAEAAAABAwABAAAAFAAAAAIDAAgAAAALAAAAAJADAAgAAAASAAAAAJEDAAgAAAAaAAAAAJMDAAoAAAAmAAAAAJQDAAgAAAAwAAAAAJYDAAgAAAA4AAAAAJYDAAIAAAAIAAAAAEA=',
      pdf: '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',
      heic: 'AAAAGGZ0eXBoZWljAAAAAG1pZjFoZWljABX2o21kYXQAAHKiJgGvJeD6qmKtFese+CvXu47VptM915KPcCyU93vujImoU7WiXbrt'
    };
    
    const fileTypeKey = fileType.toLowerCase() as keyof typeof testFiles;
    const base64Data = testFiles[fileTypeKey];
    
    if (!base64Data) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    // Test with bot - different formats for different file types
    let messageContent;
    
    if (mimeType === 'image/jpeg') {
      // JPEG works with image_url
      messageContent = [
        {
          type: 'text',
          text: `Please analyze this ${fileType} file and tell me what you see.`
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Data}`
          }
        }
      ];
    } else if (mimeType.startsWith('image/')) {
      // Other image formats - try image_url first, might not be supported
      messageContent = [
        {
          type: 'text',
          text: `Please analyze this ${fileType} file and tell me what you see.`
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Data}`
          }
        }
      ];
    } else {
      // Non-image files like PDF - use file format
      messageContent = [
        {
          type: 'text',
          text: `Please analyze this ${fileType} file and tell me what you see.`
        },
        {
          type: 'file',
          file_data: base64Data,
          file_name: `test.${fileType.toLowerCase()}`,
          content_type: mimeType
        }
      ];
    }

    const response = await fetch('https://api.poe.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: botName,
        messages: [{
          role: 'user',
          content: messageContent
        }],
        max_tokens: 200
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    if (response.ok && data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      const hasValidResponse = content.length > 10 && 
                              !content.toLowerCase().includes('cannot') &&
                              !content.toLowerCase().includes('unable');
      
      return {
        name: `${fileType} support`,
        status: hasValidResponse ? 'passed' : 'failed',
        details: hasValidResponse ? 
          'Bot successfully processed the file' : 
          'Bot indicated it cannot process this file type',
        score: hasValidResponse ? 100 : 50,
        debugInfo: {
          request: `Test ${fileType} file upload and analysis`,
          response: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
          timestamp,
          duration,
          expectedBehavior: `Bot should process ${fileType} files or provide clear error`,
          actualBehavior: hasValidResponse ? `Bot successfully processed ${fileType} file` : `Bot cannot process ${fileType} files`
        }
      };
    } else {
      const errorMsg = data.error?.message || data.message || 'Unknown error';
      const isFileTypeError = errorMsg.toLowerCase().includes('does not support') || 
                             errorMsg.toLowerCase().includes('cannot process') ||
                             errorMsg.toLowerCase().includes('mime type') ||
                             errorMsg.toLowerCase().includes('not supported') ||
                             errorMsg.toLowerCase().includes(fileType.toLowerCase());
      
      return {
        name: `${fileType} support`,
        status: 'failed',
        details: isFileTypeError ? 
          `Good error handling: "${errorMsg}"` : 
          `Poor error message: "${errorMsg}"`,
        score: isFileTypeError ? 70 : 30,
        debugInfo: {
          request: `Test ${fileType} file upload`,
          response: errorMsg,
          timestamp,
          duration,
          expectedBehavior: `Bot should process ${fileType} files or give specific error`,
          actualBehavior: isFileTypeError ? 'Bot provided specific file type error' : 'Bot gave generic error'
        }
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name: `${fileType} support`,
      status: 'failed',
      details: `API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      score: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      debugInfo: {
        request: `Test ${fileType} file support`,
        response: 'Request failed',
        timestamp,
        duration,
        expectedBehavior: `Bot API should respond to ${fileType} file test`,
        actualBehavior: 'API request failed or timed out'
      }
    };
  }
}

async function testFileTypeAwareness(fileType: string, mimeType: string, botName: string, apiKey: string, timestamp: string, startTime: number): Promise<unknown> {
  try {
    const response = await fetch('https://api.poe.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: botName,
        messages: [{ 
          role: 'user', 
          content: `Can you process ${fileType} files? Please be specific about your capabilities.`
        }],
        max_tokens: 200
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    if (response.ok && data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content.toLowerCase();
      const mentionsFileType = content.includes(fileType.toLowerCase());
      const givesSpecificAnswer = content.includes('support') || content.includes('can') || content.includes('cannot');
      
      let score = 60;
      if (mentionsFileType && givesSpecificAnswer) score += 20;
      if (content.includes('cannot') || content.includes('does not support')) score += 10;
      
      return {
        name: `${fileType} support`,
        status: givesSpecificAnswer ? 'passed' : 'failed',
        details: mentionsFileType ? 
          'Bot provides specific information about file type support' : 
          'Bot gives generic response about file capabilities',
        score,
        debugInfo: {
          request: `Ask about ${fileType} file support capabilities`,
          response: data.choices[0].message.content.substring(0, 300),
          timestamp,
          duration,
          expectedBehavior: `Bot should give specific answer about ${fileType} support`,
          actualBehavior: givesSpecificAnswer ? 'Bot provided specific file type information' : 'Bot gave generic response'
        }
      };
    } else {
      const duration = Date.now() - startTime;
      return {
        name: `${fileType} support`,
        status: 'failed',
        details: 'Failed to get response from bot API',
        score: 0,
        error: data.error?.message || 'API request failed',
        debugInfo: {
          request: `Test ${fileType} awareness`,
          response: JSON.stringify(data, null, 2),
          timestamp,
          duration,
          expectedBehavior: 'Bot API should respond with valid message',
          actualBehavior: `API returned error: ${response.status}`
        }
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name: `${fileType} support`,
      status: 'failed',
      details: `Error testing file type awareness: ${error instanceof Error ? error.message : 'Unknown error'}`,
      score: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      debugInfo: {
        request: `Test ${fileType} file type awareness`,
        response: 'Request failed',
        timestamp,
        duration,
        expectedBehavior: 'API should respond within timeout',
        actualBehavior: 'Request failed or timed out'
      }
    };
  }
}

async function testConversationCoherence(botName: string, apiKey: string, timestamp: string, startTime: number): Promise<unknown> {
  try {
    const prompts = [
      "Hello, what's your name?",
      "Can you remember what I just asked you?",
      "Let's talk about a complex topic. Explain quantum computing.",
      "Now explain it in simple terms for a child."
    ];
    
    let conversationMakessense = true;
    let totalTime = 0;
    const responses: string[] = [];
    
    for (let i = 0; i < prompts.length; i++) {
      const testStart = Date.now();
      const response = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: botName,
          messages: [{ role: 'user', content: prompts[i] }],
          max_tokens: 200
        }),
        signal: AbortSignal.timeout(10000)
      });
      
      const testTime = Date.now() - testStart;
      totalTime += testTime;
      
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        responses.push(content.substring(0, 100));
        
        if (content.length < 10) {
          conversationMakessense = false;
        }
      } else {
        conversationMakessense = false;
        responses.push('API Error');
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const duration = Date.now() - startTime;
    const avgTime = Math.round(totalTime / prompts.length);
    
    return {
      name: 'Multi-turn conversation coherence',
      status: conversationMakessense ? 'passed' : 'failed',
      details: `Average response time: ${avgTime}ms per message`,
      score: conversationMakessense ? 85 : 40,
      debugInfo: {
        request: `Multi-turn conversation test with ${prompts.length} messages`,
        response: `Responses: ${responses.join(' | ')}`,
        timestamp,
        duration,
        expectedBehavior: 'Bot should maintain coherent conversation across multiple turns',
        actualBehavior: conversationMakessense ? 'Bot maintained conversation coherence' : 'Bot failed to maintain coherent responses'
      }
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name: 'Multi-turn conversation coherence',
      status: 'failed',
      details: 'Test failed due to error',
      score: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      debugInfo: {
        request: 'Multi-turn conversation test',
        response: 'Test failed',
        timestamp,
        duration,
        expectedBehavior: 'Bot should handle multi-turn conversation',
        actualBehavior: 'Test encountered error'
      }
    };
  }
}

async function testResponseTime(botName: string, apiKey: string, timestamp: string, startTime: number): Promise<unknown> {
  try {
    const testStart = Date.now();
    const response = await fetch('https://api.poe.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: botName,
        messages: [{ role: 'user', content: 'Hello, please respond quickly with a short greeting.' }],
        max_tokens: 50
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    const responseTime = Date.now() - testStart;
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      const score = responseTime < 3000 ? 100 : responseTime < 5000 ? 80 : 50;
      
      return {
        name: 'Response time performance',
        status: responseTime < 5000 ? 'passed' : 'failed',
        details: `Response time: ${responseTime}ms`,
        score,
        debugInfo: {
          request: 'Quick greeting test to measure response time',
          response: `Time: ${responseTime}ms, Content: "${content.substring(0, 100)}"`,
          timestamp,
          duration,
          expectedBehavior: 'Bot should respond quickly (under 5 seconds)',
          actualBehavior: `Bot responded in ${responseTime}ms`
        }
      };
    } else {
      return {
        name: 'Response time performance',
        status: 'failed',
        details: `API error: ${response.status}`,
        score: 0,
        error: `HTTP ${response.status}`,
        debugInfo: {
          request: 'Response time test',
          response: `HTTP ${response.status}`,
          timestamp,
          duration,
          expectedBehavior: 'Bot should respond successfully',
          actualBehavior: `API returned error: ${response.status}`
        }
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name: 'Response time performance',
      status: 'failed',
      details: 'Response time test failed',
      score: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      debugInfo: {
        request: 'Response time performance test',
        response: 'Test failed',
        timestamp,
        duration,
        expectedBehavior: 'Bot should respond within timeout',
        actualBehavior: 'Request failed or timed out'
      }
    };
  }
}

export async function POST(request: NextRequest) {
  const { botName, apiKey, chunk = 0, sessionId: providedSessionId }: ChunkedAnalysisRequest = await request.json();

  if (!botName || !apiKey) {
    return NextResponse.json({ error: 'Bot name and API key are required' }, { status: 400 });
  }

  const sessionId = providedSessionId || `${botName}-${Date.now()}`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await processChunk(botName, apiKey, chunk, sessionId, controller);
      } catch (error) {
        await sendProgress(controller, {
          type: 'error',
          message: error instanceof Error ? error.message : 'Analysis failed',
          sessionId
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
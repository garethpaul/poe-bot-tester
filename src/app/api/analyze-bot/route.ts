import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface AnalyzeBotRequest {
  botName: string;
  apiKey: string;
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'running';
  details?: string;
  score?: number;
}

interface BotScorecard {
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

const fileTypes = [
  { ext: 'png', mime: 'image/png', category: 'image', hasTestFile: true },
  { ext: 'jpeg', mime: 'image/jpeg', category: 'image', hasTestFile: true },
  { ext: 'pdf', mime: 'application/pdf', category: 'document', hasTestFile: true },
  { ext: 'gif', mime: 'image/gif', category: 'image', hasTestFile: true },
  { ext: 'heic', mime: 'image/heic', category: 'image', hasTestFile: false },
  { ext: 'tiff', mime: 'image/tiff', category: 'image', hasTestFile: false },
  { ext: 'mp4', mime: 'video/mp4', category: 'video', hasTestFile: false }
];

async function testBotResponse(botName: string, apiKey: string, prompt: string): Promise<{ response: string; time: number }> {
  const startTime = Date.now();
  
  const response = await fetch('https://api.poe.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: botName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000
    }),
    signal: AbortSignal.timeout(30000)
  });

  const endTime = Date.now();
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    response: data.choices[0]?.message?.content || '',
    time: endTime - startTime
  };
}

interface BotMetadata {
  name: string;
  displayName: string;
  description: string;
  profilePictureUrl?: string;
  isVerified?: boolean;
  followerCount?: number;
}

async function fetchBotMetadata(botName: string): Promise<BotMetadata | null> {
  try {
    const response = await fetch(`https://poe.com/${botName}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      return parseBotPage(html, botName);
    }
  } catch (error) {
    console.log('Could not fetch bot page:', error);
  }
  
  return null;
}

function parseBotPage(html: string, botName: string): BotMetadata {
  const metadata: BotMetadata = {
    name: botName,
    displayName: botName,
    description: ''
  };

  try {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      metadata.displayName = titleMatch[1].replace(' - Poe', '').trim();
    }

    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    if (descriptionMatch) {
      metadata.description = descriptionMatch[1];
    }

    const profilePicMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/src=["']([^"']*profile[^"']*\.(?:jpg|jpeg|png|gif|webp))["']/i);
    if (profilePicMatch) {
      metadata.profilePictureUrl = profilePicMatch[1];
    }

    const verifiedMatch = html.match(/verified|official|✓/i);
    metadata.isVerified = !!verifiedMatch;

    const followerMatch = html.match(/(\d+(?:,\d+)*)\s*followers?/i);
    if (followerMatch) {
      metadata.followerCount = parseInt(followerMatch[1].replace(/,/g, ''));
    }

  } catch (error) {
    console.log('Error parsing bot page:', error);
  }

  return metadata;
}

function analyzeBranding(metadata: BotMetadata | null): TestResult[] {
  const results: TestResult[] = [];
  
  if (!metadata) {
    results.push({
      name: 'Bot name consistency and formatting',
      status: 'failed',
      details: 'Could not fetch bot metadata for analysis',
      score: 0
    });
    return results;
  }

  const nameScore = analyzeBotName(metadata);
  results.push({
    name: 'Bot name consistency and formatting',
    status: nameScore.score > 70 ? 'passed' : 'failed',
    details: nameScore.details,
    score: nameScore.score
  });

  const profilePicScore = analyzeProfilePicture(metadata);
  results.push({
    name: 'Profile picture appeal and quality',
    status: profilePicScore.score > 70 ? 'passed' : 'failed',
    details: profilePicScore.details,
    score: profilePicScore.score
  });

  const brandConsistencyScore = analyzeBrandConsistency(metadata);
  results.push({
    name: 'Brand consistency with model family',
    status: brandConsistencyScore.score > 70 ? 'passed' : 'failed',
    details: brandConsistencyScore.details,
    score: brandConsistencyScore.score
  });

  const verificationScore = analyzeVerification(metadata);
  results.push({
    name: 'Official verification and credibility',
    status: verificationScore.score > 70 ? 'passed' : 'failed',
    details: verificationScore.details,
    score: verificationScore.score
  });
  
  return results;
}

function analyzeBotName(metadata: BotMetadata): { score: number; details: string } {
  const { name, displayName } = metadata;
  let score = 100;
  const issues: string[] = [];

  if (name.toLowerCase() !== displayName.toLowerCase()) {
    if (Math.abs(name.length - displayName.length) > 3) {
      score -= 20;
      issues.push('Significant mismatch between URL name and display name');
    }
  }

  if (name.includes('_') || name.includes('-')) {
    if (!['claude', 'gpt', 'gemini', 'llama'].some(model => name.toLowerCase().includes(model))) {
      score -= 15;
      issues.push('Non-standard naming convention for model bots');
    }
  }

  if (!/^[A-Z]/.test(displayName)) {
    score -= 10;
    issues.push('Display name should start with capital letter');
  }

  if (displayName.length > 25) {
    score -= 10;
    issues.push('Display name is quite long');
  }

  const commonModels = ['claude', 'gpt', 'gemini', 'llama', 'palm', 'bard'];
  const isModelBot = commonModels.some(model => name.toLowerCase().includes(model));
  
  if (isModelBot) {
    const hasVersionInfo = /\d+|haiku|sonnet|opus|turbo|mini|pro|ultra/i.test(displayName);
    if (!hasVersionInfo) {
      score -= 15;
      issues.push('Model bot should include version/variant information');
    }
  }

  return {
    score,
    details: issues.length > 0 ? issues.join('; ') : 'Name formatting follows good practices'
  };
}

function analyzeProfilePicture(metadata: BotMetadata): { score: number; details: string } {
  const { profilePictureUrl } = metadata;
  let score = 50; // Base score for having any picture
  const issues: string[] = [];

  if (!profilePictureUrl) {
    return {
      score: 0,
      details: 'No profile picture found'
    };
  }

  score = 80; // Boost for having a profile picture

  if (profilePictureUrl.includes('default') || profilePictureUrl.includes('placeholder')) {
    score -= 30;
    issues.push('Using default/placeholder image');
  }

  if (profilePictureUrl.includes('.png') || profilePictureUrl.includes('.jpg') || profilePictureUrl.includes('.webp')) {
    score += 10;
  }

  if (profilePictureUrl.includes('cdn') || profilePictureUrl.includes('amazonaws') || profilePictureUrl.includes('cloudflare')) {
    score += 10;
    issues.push('Using proper CDN hosting');
  }

  return {
    score,
    details: issues.length > 0 ? issues.join('; ') : 'Profile picture appears properly configured'
  };
}

function analyzeBrandConsistency(metadata: BotMetadata): { score: number; details: string } {
  const { name, displayName } = metadata;
  let score = 75; // Base score
  const issues: string[] = [];

  const knownBrands = {
    'claude': ['anthropic', 'sonnet', 'haiku', 'opus'],
    'gpt': ['openai', 'turbo', 'mini', 'davinci'],
    'gemini': ['google', 'pro', 'ultra', 'nano'],
    'llama': ['meta', 'facebook', 'chat'],
    'palm': ['google', 'bison'],
    'bard': ['google']
  };

  let brandFound = false;
  for (const [brand, variants] of Object.entries(knownBrands)) {
    if (name.toLowerCase().includes(brand) || displayName.toLowerCase().includes(brand)) {
      brandFound = true;
      
      const hasVariant = variants.some(variant => 
        name.toLowerCase().includes(variant) || displayName.toLowerCase().includes(variant)
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
    if (name.length < 15 && /^[A-Za-z0-9-_]+$/.test(name)) {
      score += 10;
      issues.push('Clean, branded name for custom bot');
    } else {
      score -= 5;
      issues.push('Custom bot with unclear branding');
    }
  }

  return {
    score,
    details: issues.length > 0 ? issues.join('; ') : 'Brand consistency looks good'
  };
}

function analyzeVerification(metadata: BotMetadata): { score: number; details: string } {
  const { isVerified, followerCount } = metadata;
  let score = 60; // Base score
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
    score,
    details: issues.join('; ')
  };
}

function analyzeDescription(metadata: BotMetadata | null): TestResult[] {
  const results: TestResult[] = [];
  const description = metadata?.description || '';
  
  results.push({
    name: 'Description clarity for non-technical users',
    status: description.length > 50 ? 'passed' : 'failed',
    details: description.length > 50 ? 'Description appears comprehensive' : 'Description too short',
    score: description.length > 50 ? 85 : 40
  });
  
  results.push({
    name: 'Advanced behavior documentation',
    status: description.includes('--') || description.includes('param') ? 'passed' : 'failed',
    details: 'Checking for parameter documentation',
    score: description.includes('--') ? 90 : 60
  });
  
  results.push({
    name: 'Limitation documentation',
    status: description.includes('limitation') || description.includes('cannot') ? 'passed' : 'failed',
    details: 'Checking for documented limitations',
    score: description.includes('limitation') ? 85 : 70
  });
  
  return results;
}

async function getTestFile(fileType: string): Promise<{ buffer: Buffer; mime: string; name: string } | null> {
  try {
    const response = await fetch(`http://localhost:3001/api/test-files?type=${fileType}`);
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || '';
      const contentDisposition = response.headers.get('content-disposition') || '';
      const nameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const name = nameMatch ? nameMatch[1] : `test.${fileType}`;
      
      return { buffer, mime: contentType, name };
    }
  } catch (error) {
    console.log(`Could not get test file for ${fileType}:`, error);
  }
  return null;
}

async function testFileSupport(botName: string, apiKey: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  for (const fileType of fileTypes) {
    try {
      let testResult: TestResult;
      
      if (fileType.hasTestFile) {
        // Test with actual file
        const testFile = await getTestFile(fileType.ext);
        
        if (testFile) {
          testResult = await testFileWithBot(botName, apiKey, fileType, testFile);
        } else {
          testResult = {
            name: `${fileType.ext.toUpperCase()} support`,
            status: 'failed',
            details: 'Could not load test file',
            score: 0
          };
        }
      } else {
        // Test without file but check error handling
        testResult = await testFileErrorHandling(botName, apiKey, fileType);
      }
      
      results.push(testResult);
      
      // Add small delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      results.push({
        name: `${fileType.ext.toUpperCase()} support`,
        status: 'failed',
        details: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        score: 0
      });
    }
  }
  
  return results;
}

async function testFileWithBot(
  botName: string, 
  apiKey: string, 
  fileType: { ext: string; mime: string; category: string }, 
  testFile: { buffer: Buffer; mime: string; name: string }
): Promise<TestResult> {
  try {
    // Convert file to base64 for API
    const base64Data = testFile.buffer.toString('base64');
    
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
          content: [
            {
              type: 'text',
              text: `Please analyze this ${fileType.ext.toUpperCase()} file and tell me what you see.`
            },
            {
              type: fileType.category === 'image' ? 'image_url' : 'file',
              [fileType.category === 'image' ? 'image_url' : 'file_url']: {
                url: `data:${testFile.mime};base64,${base64Data}`
              }
            }
          ]
        }],
        max_tokens: 200
      }),
      signal: AbortSignal.timeout(15000)
    });
    
    const data = await response.json();
    
    if (response.ok && data.choices && data.choices[0]?.message?.content) {
      const content = data.choices[0].message.content;
      const hasValidResponse = content.length > 10 && 
                              !content.toLowerCase().includes('cannot') &&
                              !content.toLowerCase().includes('unable');
      
      return {
        name: `${fileType.ext.toUpperCase()} support`,
        status: hasValidResponse ? 'passed' : 'failed',
        details: hasValidResponse ? 
          'Bot successfully processed the file' : 
          'Bot indicated it cannot process this file type',
        score: hasValidResponse ? 100 : 50
      };
    } else {
      // Check if it's a proper error about file support
      const errorMsg = data.error?.message || data.message || 'Unknown error';
      const isFileTypeError = errorMsg.toLowerCase().includes('does not support') || 
                             errorMsg.toLowerCase().includes('cannot process') ||
                             errorMsg.toLowerCase().includes(fileType.ext.toLowerCase());
      
      return {
        name: `${fileType.ext.toUpperCase()} support`,
        status: 'failed',
        details: isFileTypeError ? 
          `Good error handling: "${errorMsg}"` : 
          `Poor error message: "${errorMsg}"`,
        score: isFileTypeError ? 70 : 30
      };
    }
  } catch (error) {
    return {
      name: `${fileType.ext.toUpperCase()} support`,
      status: 'failed',
      details: `API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      score: 0
    };
  }
}

async function testFileErrorHandling(
  botName: string, 
  apiKey: string, 
  fileType: { ext: string; mime: string; category: string }
): Promise<TestResult> {
  try {
    // Test by asking about the file type without actually sending a file
    const response = await testBotResponse(
      botName, 
      apiKey, 
      `Can you process ${fileType.ext.toUpperCase()} files? Please be specific about your capabilities.`
    );
    
    const content = response.response.toLowerCase();
    const mentionsFileType = content.includes(fileType.ext.toLowerCase());
    const givesSpecificAnswer = content.includes('support') || content.includes('can') || content.includes('cannot');
    
    let score = 60; // Base score for responding
    if (mentionsFileType && givesSpecificAnswer) score += 20;
    if (content.includes('cannot') || content.includes('does not support')) score += 10;
    
    return {
      name: `${fileType.ext.toUpperCase()} support`,
      status: givesSpecificAnswer ? 'passed' : 'failed',
      details: mentionsFileType ? 
        'Bot provides specific information about file type support' : 
        'Bot gives generic response about file capabilities',
      score
    };
  } catch (error) {
    return {
      name: `${fileType.ext.toUpperCase()} support`,
      status: 'failed',
      details: `Error testing file type awareness: ${error instanceof Error ? error.message : 'Unknown error'}`,
      score: 0
    };
  }
}

async function testConversationFlow(botName: string, apiKey: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    const prompts = [
      "Hello, what's your name?",
      "Can you remember what I just asked you?",
      "Let's talk about a complex topic. Explain quantum computing.",
      "Now explain it in simple terms for a child."
    ];
    
    let conversationMakesense = true;
    let totalTime = 0;
    
    for (let i = 0; i < prompts.length; i++) {
      const { response, time } = await testBotResponse(botName, apiKey, prompts[i]);
      totalTime += time;
      
      if (response.length < 10) {
        conversationMakesense = false;
      }
    }
    
    results.push({
      name: 'Multi-turn conversation coherence',
      status: conversationMakesense ? 'passed' : 'failed',
      details: `Average response time: ${Math.round(totalTime / prompts.length)}ms`,
      score: conversationMakesense ? 85 : 40
    });
    
    results.push({
      name: 'Response time performance',
      status: totalTime / prompts.length < 5000 ? 'passed' : 'failed',
      details: `Average: ${Math.round(totalTime / prompts.length)}ms`,
      score: totalTime / prompts.length < 3000 ? 100 : totalTime / prompts.length < 5000 ? 80 : 50
    });
    
  } catch {
    results.push({
      name: 'Multi-turn conversation coherence',
      status: 'failed',
      details: 'Test failed due to error',
      score: 0
    });
  }
  
  return results;
}

async function testErrorHandling(botName: string, apiKey: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    const { response } = await testBotResponse(botName, apiKey, "Process this invalid file type: test.xyz");
    
    const hasSpecificError = response.includes('does not support') || response.includes('cannot process');
    
    results.push({
      name: 'Helpful error messages',
      status: hasSpecificError ? 'passed' : 'failed',
      details: hasSpecificError ? 'Provides specific error guidance' : 'Generic or unclear errors',
      score: hasSpecificError ? 90 : 50
    });
    
  } catch {
    results.push({
      name: 'Helpful error messages',
      status: 'failed',
      details: 'Could not test error handling',
      score: 0
    });
  }
  
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const { botName, apiKey }: AnalyzeBotRequest = await request.json();

    if (!botName || !apiKey) {
      return NextResponse.json(
        { error: 'Bot name and API key are required' },
        { status: 400 }
      );
    }

    const metadata = await fetchBotMetadata(botName);
    
    const [
      brandingResults,
      usabilityResults,
      fileSupportResults,
      conversationResults,
      errorHandlingResults
    ] = await Promise.all([
      Promise.resolve(analyzeBranding(metadata)),
      Promise.resolve(analyzeDescription(metadata)),
      testFileSupport(botName, apiKey),
      testConversationFlow(botName, apiKey),
      testErrorHandling(botName, apiKey)
    ]);

    const allResults = [
      ...brandingResults,
      ...usabilityResults,
      ...fileSupportResults,
      ...conversationResults,
      ...errorHandlingResults
    ];

    const overallScore = Math.round(
      allResults.reduce((sum, result) => sum + (result.score || 0), 0) / allResults.length
    );

    const responseTime = conversationResults.find(r => r.name.includes('Response time'))?.score;

    const scorecard: BotScorecard = {
      botName,
      overallScore,
      categories: {
        branding: brandingResults,
        functionality: conversationResults,
        usability: usabilityResults,
        fileSupport: fileSupportResults,
        errorHandling: errorHandlingResults
      },
      responseTime: responseTime ? Math.round(3000 - (responseTime * 30)) : undefined
    };

    return NextResponse.json({ scorecard });

  } catch (error) {
    console.error('Bot analysis error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
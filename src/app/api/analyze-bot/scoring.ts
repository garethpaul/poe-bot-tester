export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'running';
  details?: string;
  score?: number;
}

export interface BotMetadata {
  name: string;
  displayName: string;
  description: string;
  profilePictureUrl?: string;
  isVerified?: boolean;
  followerCount?: number;
}

export function parseBotPage(html: string, botName: string): BotMetadata {
  const metadata: BotMetadata = {
    name: botName,
    displayName: botName,
    description: '',
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

export function analyzeBotName(metadata: BotMetadata): { score: number; details: string } {
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
    details: issues.length > 0 ? issues.join('; ') : 'Name formatting follows good practices',
  };
}

export function analyzeDescription(metadata: BotMetadata | null): TestResult[] {
  const results: TestResult[] = [];
  const description = metadata?.description || '';

  results.push({
    name: 'Description clarity for non-technical users',
    status: description.length > 50 ? 'passed' : 'failed',
    details: description.length > 50 ? 'Description appears comprehensive' : 'Description too short',
    score: description.length > 50 ? 85 : 40,
  });

  results.push({
    name: 'Advanced behavior documentation',
    status: description.includes('--') || description.includes('param') ? 'passed' : 'failed',
    details: 'Checking for parameter documentation',
    score: description.includes('--') ? 90 : 60,
  });

  results.push({
    name: 'Limitation documentation',
    status: description.includes('limitation') || description.includes('cannot') ? 'passed' : 'failed',
    details: 'Checking for documented limitations',
    score: description.includes('limitation') ? 85 : 70,
  });

  return results;
}

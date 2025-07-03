'use client';

import { useState } from 'react';

interface TestResult {
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

interface ProgressState {
  message: string;
  progress: number;
  currentTest: number;
  totalTests: number;
  currentCategory?: string;
  liveResults: {
    branding: TestResult[];
    functionality: TestResult[];
    usability: TestResult[];
    fileSupport: TestResult[];
    errorHandling: TestResult[];
  };
}

// Component for displaying individual test results with expandable details
function TestResultCard({ test }: { test: TestResult }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-700 rounded border border-gray-600">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-650 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex-1 text-gray-200 text-sm">{test.name}</span>
        <div className="flex items-center gap-2">
          {test.score !== undefined && (
            <span className="text-xs font-medium text-gray-300">{test.score}%</span>
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            test.status === 'passed' ? 'bg-green-900 text-green-300 border border-green-700' :
            test.status === 'failed' ? 'bg-red-900 text-red-300 border border-red-700' :
            test.status === 'running' ? 'bg-yellow-900 text-yellow-300 border border-yellow-700' :
            'bg-gray-800 text-gray-300 border border-gray-600'
          }`}>
            {test.status}
          </span>
          <span className="text-gray-400 text-xs ml-1">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-600">
          <div className="mt-2 space-y-2 text-xs">
            {test.details && (
              <div>
                <span className="font-medium text-gray-300">Details: </span>
                <span className="text-gray-400">{test.details}</span>
              </div>
            )}
            
            {test.error && (
              <div>
                <span className="font-medium text-red-400">Error: </span>
                <span className="text-red-300">{test.error}</span>
              </div>
            )}
            
            {test.debugInfo && (
              <div className="mt-3 p-2 bg-gray-800 rounded border border-gray-600">
                <div className="font-medium text-gray-300 mb-2">Debug Information:</div>
                
                {test.debugInfo.expectedBehavior && (
                  <div className="mb-1">
                    <span className="font-medium text-green-400">Expected: </span>
                    <span className="text-green-300">{test.debugInfo.expectedBehavior}</span>
                  </div>
                )}
                
                {test.debugInfo.actualBehavior && (
                  <div className="mb-1">
                    <span className="font-medium text-red-400">Actual: </span>
                    <span className="text-red-300">{test.debugInfo.actualBehavior}</span>
                  </div>
                )}
                
                {test.debugInfo.request && (
                  <div className="mb-1">
                    <span className="font-medium text-blue-400">Request: </span>
                    <pre className="text-blue-300 whitespace-pre-wrap mt-1 p-1 bg-gray-900 rounded text-xs">
                      {test.debugInfo.request}
                    </pre>
                  </div>
                )}
                
                {test.debugInfo.response && (
                  <div className="mb-1">
                    <span className="font-medium text-purple-400">Response: </span>
                    <pre className="text-purple-300 whitespace-pre-wrap mt-1 p-1 bg-gray-900 rounded text-xs max-h-32 overflow-y-auto">
                      {test.debugInfo.response}
                    </pre>
                  </div>
                )}
                
                {test.debugInfo.duration && (
                  <div className="mb-1">
                    <span className="font-medium text-yellow-400">Duration: </span>
                    <span className="text-yellow-300">{test.debugInfo.duration}ms</span>
                  </div>
                )}
                
                {test.debugInfo.timestamp && (
                  <div>
                    <span className="font-medium text-gray-400">Timestamp: </span>
                    <span className="text-gray-300">{test.debugInfo.timestamp}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [botName, setBotName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [scorecard, setScorecard] = useState<BotScorecard | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState | null>(null);

  const runBotAnalysis = async () => {
    if (!botName.trim()) {
      alert('Please enter a bot name');
      return;
    }
    if (!apiKey.trim()) {
      alert('Please enter your API key');
      return;
    }
    
    setIsRunning(true);
    setScorecard(null);
    setProgressState({
      message: 'Initializing analysis...',
      progress: 0,
      currentTest: 0,
      totalTests: 7, // Number of chunks
      liveResults: {
        branding: [],
        functionality: [],
        usability: [],
        fileSupport: [],
        errorHandling: []
      }
    });
    
    await runChunkedAnalysis(0, null);
  };

  const runChunkedAnalysis = async (chunkIndex: number, sessionId: string | null, retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3;
    
    try {
      const response = await fetch('/api/analyze-bot-chunked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          botName,
          apiKey,
          chunk: chunkIndex,
          sessionId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let currentSessionId = sessionId;
      let nextChunk = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Update session ID if provided
              if (data.sessionId && !currentSessionId) {
                currentSessionId = data.sessionId;
              }
              
              // Check for chunk completion
              if (data.type === 'chunk_complete' && data.nextChunk !== undefined) {
                nextChunk = data.nextChunk;
              }
              
              handleProgressUpdate(data);
              
              // If analysis is complete, stop here
              if (data.type === 'complete') {
                setIsRunning(false);
                return;
              }
              
            } catch (e) {
              console.log('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // If we have a next chunk, continue the analysis
      if (nextChunk !== null) {
        setTimeout(() => {
          runChunkedAnalysis(nextChunk, currentSessionId);
        }, 1000); // Small delay before next chunk
      } else {
        setIsRunning(false);
      }

    } catch (error) {
      console.log(`Chunk ${chunkIndex} failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < MAX_RETRIES) {
        // Retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        setProgressState(prev => prev ? {
          ...prev,
          message: `Connection lost, retrying in ${delay/1000}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`
        } : null);
        
        setTimeout(() => {
          runChunkedAnalysis(chunkIndex, sessionId, retryCount + 1);
        }, delay);
      } else {
        alert(`Analysis failed after ${MAX_RETRIES} retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsRunning(false);
      }
    }
  };

  const handleProgressUpdate = (data: { type: string; category?: string; testName?: string; message?: string; result?: TestResult; progress?: number; currentTest?: number; totalTests?: number }) => {
    switch (data.type) {
      case 'progress':
        setProgressState(prev => prev ? {
          ...prev,
          message: data.message || prev.message,
          progress: data.progress || prev.progress,
          currentTest: data.currentTest || prev.currentTest,
          totalTests: data.totalTests || prev.totalTests
        } : null);
        break;

      case 'category_start':
        setProgressState(prev => prev ? {
          ...prev,
          currentCategory: data.category,
          message: data.message || prev.message
        } : null);
        break;

      case 'test_start':
        setProgressState(prev => prev ? {
          ...prev,
          message: data.message || prev.message
        } : null);
        break;

      case 'test_complete':
        setProgressState(prev => {
          if (!prev || !data.result) return prev;
          
          const newResults = { ...prev.liveResults };
          const category = data.category as keyof typeof newResults;
          const result = data.result as TestResult;
          
          if (newResults[category]) {
            // Update existing test or add new one
            const existingIndex = newResults[category].findIndex(
              test => test.name === result.name
            );
            
            if (existingIndex >= 0) {
              newResults[category][existingIndex] = result;
            } else {
              newResults[category].push(result);
            }
          }

          return {
            ...prev,
            liveResults: newResults,
            message: `Completed: ${data.testName || 'test'}`
          };
        });
        break;

      case 'category_complete':
        setProgressState(prev => prev ? {
          ...prev,
          message: `${data.category || 'Category'} analysis complete`
        } : null);
        break;

      case 'complete':
        setScorecard(data.result as unknown as BotScorecard);
        setProgressState(null);
        break;

      case 'chunk_complete':
        setProgressState(prev => prev ? {
          ...prev,
          message: data.message || 'Chunk completed, continuing...'
        } : null);
        break;

      case 'error':
        alert(`Analysis error: ${data.message || 'Unknown error'}`);
        setProgressState(null);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          Poe Bot Tester
        </h1>
        
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bot Name
              </label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="e.g., Assistant, ChatGPT, Claude"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter the name of the Poe bot you want to analyze
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your Poe API key"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Required for automated testing
              </p>
            </div>
          </div>
          
          <button
            onClick={runBotAnalysis}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            disabled={isRunning}
          >
            {isRunning ? 'Analyzing Bot...' : 'Run Complete Bot Analysis'}
          </button>
        </div>

        {progressState && (
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 mb-6">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-white">Analysis Progress</h3>
                <span className="text-sm text-gray-300">
                  {progressState.currentTest}/{progressState.totalTests} chunks
                </span>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressState.progress}%` }}
                ></div>
              </div>
              
              <p className="text-sm text-gray-300">{progressState.message}</p>
              
              {progressState.currentCategory && (
                <p className="text-xs text-blue-400 mt-1">
                  Current Category: {progressState.currentCategory.replace(/([A-Z])/g, ' $1').trim()}
                </p>
              )}
            </div>

            {/* Live Results Display */}
            <div className="space-y-4">
              {Object.entries(progressState.liveResults).map(([category, tests]) => (
                tests.length > 0 && (
                  <div key={category} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="text-md font-medium text-gray-200 mb-2 capitalize">
                      {category.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <div className="space-y-1">
                      {tests.map((test, index) => (
                        <TestResultCard key={index} test={test} />
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {scorecard && (
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Bot Analysis: {scorecard.botName}
              </h2>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-blue-400">
                  {scorecard.overallScore}%
                </div>
                <div className="text-sm text-gray-300">
                  Overall Score
                  {scorecard.responseTime && (
                    <span className="ml-4">Response Time: {scorecard.responseTime}ms</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(scorecard.categories).map(([category, tests]) => (
                <div key={category} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-200 mb-3 capitalize">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <div className="space-y-2">
                    {tests.map((test, index) => (
                      <TestResultCard key={index} test={test} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!scorecard && !isRunning && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No bot analysis yet</p>
            <p className="text-sm text-gray-500">
              Enter a bot name and API key above, then click &quot;Run Complete Bot Analysis&quot; to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
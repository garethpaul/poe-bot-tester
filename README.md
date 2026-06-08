# Poe Bot Tester

<!-- README-OVERVIEW-IMAGE -->
![Project overview](docs/readme-overview.svg)

A comprehensive Next.js application for testing and analyzing bots on the Poe.com platform. This tool provides detailed analysis of bot performance, capabilities, and user experience across multiple categories.

## Features

### 🔍 Comprehensive Bot Analysis
- **Branding & Identity**: Analyze bot name consistency, profile picture quality, brand alignment, and verification status
- **Functionality Testing**: Multi-turn conversation coherence, response time performance, and API reliability
- **File Support**: Test support for various file formats (PNG, JPEG, PDF, GIF, HEIC, TIFF, MP4)
- **User Experience**: Description clarity, documentation quality, and limitation transparency
- **Error Handling**: Evaluate helpful error messages and graceful failure handling

### 🚀 Advanced Testing Capabilities
- **Chunked Analysis**: Intelligent test execution with automatic chunking to prevent timeouts
- **Real-time Progress**: Live updates with expandable test results and detailed debug information
- **Retry Logic**: Automatic retry with exponential backoff for network resilience
- **Session Management**: Stateful analysis tracking across multiple test chunks

### 📊 Detailed Scoring System
- Overall bot score (0-100%)
- Category-specific scoring
- Individual test results with pass/fail status
- Detailed debug information for each test
- Performance metrics and response time tracking

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm
- A valid Poe.com API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/poe-bot-tester.git
cd poe-bot-tester
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Quality Gates

Run the complete local verification gate before pushing changes:

```bash
npm run verify
```

The combined gate runs ESLint, TypeScript checking, a production Next.js build,
and `npm audit --audit-level=moderate`.

### Usage

1. **Enter Bot Details**: Input the bot name and your Poe API key
2. **Run Analysis**: Click "Run Complete Bot Analysis" to start comprehensive testing
3. **Monitor Progress**: Watch real-time progress updates and live test results
4. **Review Results**: Expand individual test results for detailed debug information

## API Endpoints

### `/api/analyze-bot`
Traditional single-request bot analysis endpoint.

**Method**: POST  
**Body**: 
```json
{
  "botName": "string",
  "apiKey": "string"
}
```

### `/api/analyze-bot-chunked`
Chunked analysis endpoint for handling large test suites without timeout.

**Method**: POST  
**Body**: 
```json
{
  "botName": "string",
  "apiKey": "string",
  "chunk": 0,
  "sessionId": "optional-session-id"
}
```

**Response**: Server-Sent Events (SSE) stream

### `/api/test-bot`
Simple bot testing endpoint for quick validation.

**Method**: POST  
**Body**: 
```json
{
  "botName": "string",
  "prompt": "string"
}
```

### `/api/test-files`
Test file serving endpoint for file support testing.

**Method**: GET  
**Query**: `?type=png|jpeg|pdf|gif|heic|tiff|mp4`

## Test Categories

### 🎨 Branding (25% weight)
- Bot name consistency and formatting
- Profile picture appeal and quality  
- Brand consistency with model family
- Official verification and credibility

### ⚡ Functionality (25% weight)
- Multi-turn conversation coherence
- Response time performance

### 📝 Usability (25% weight)
- Description clarity for non-technical users
- Advanced behavior documentation
- Limitation documentation

### 📎 File Support (15% weight)
- Support for common image formats (PNG, JPEG, GIF)
- Document processing capabilities (PDF)
- Advanced format awareness (HEIC, TIFF, MP4)

### 🚨 Error Handling (10% weight)
- Helpful error messages
- Graceful failure handling

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Runtime**: Edge Runtime for API routes
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 5
- **UI Components**: Custom React components
- **HTTP Client**: Native fetch
- **Development**: ESLint, Turbopack

## Project Structure

```
poe-bot-tester/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze-bot/           # Single-request analysis
│   │   │   ├── analyze-bot-chunked/   # Chunked analysis with SSE
│   │   │   ├── analyze-bot-stream/    # Streaming analysis
│   │   │   ├── test-bot/              # Simple bot testing
│   │   │   └── test-files/            # Test file serving
│   │   ├── globals.css                # Global styles
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Main application UI
│   └── app/
├── public/
│   └── test-files/                    # Test files for upload testing
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.ts
```

## Configuration

### Environment Variables
Create a `.env.local` file:
```bash
# Optional: Configure default API settings
NEXT_PUBLIC_DEFAULT_API_URL=https://api.poe.com/v1
```

### Tailwind CSS
The project uses Tailwind CSS 4 with custom configuration for dark theme support.

### TypeScript
Strict TypeScript configuration with comprehensive type definitions for bot analysis.

## Testing Methodology

### Metadata Analysis
- Fetches bot profile pages from poe.com
- Parses HTML for display name, description, profile picture
- Analyzes verification status and follower metrics

### API Testing
- Uses Poe.com API for functional testing
- Tests conversation flow and response quality
- Measures response times and error handling

### File Support Testing
- Tests actual file uploads with sample files
- Validates proper error messages for unsupported formats
- Checks file type awareness and capability reporting

## Performance Considerations

- **Chunked Processing**: Prevents timeout issues with large test suites
- **Edge Runtime**: Faster cold starts and better performance
- **Connection Pooling**: Efficient HTTP connection management
- **Retry Logic**: Automatic retry for transient failures
- **Rate Limiting**: Built-in delays to respect API limits

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Poe.com API](https://poe.com/)
- Icons from [Heroicons](https://heroicons.com/)

## Support

For support, questions, or feature requests, please open an issue in the GitHub repository.

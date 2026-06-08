import assert from 'node:assert/strict';

import {
  analyzeBotName,
  analyzeDescription,
  parseBotPage,
} from '../src/app/api/analyze-bot/scoring';

const sampleHtml = `
<!doctype html>
<html>
  <head>
    <title>HelperBot - Poe</title>
    <meta name="description" content="HelperBot gives detailed, friendly support with --tone options and documents limitations for uploaded files.">
    <meta property="og:image" content="https://cdn.example.com/helperbot.png">
  </head>
  <body>
    <span>verified</span>
    <span>12,345 followers</span>
  </body>
</html>`;

const metadata = parseBotPage(sampleHtml, 'HelperBot');

assert.deepEqual(metadata, {
  name: 'HelperBot',
  displayName: 'HelperBot',
  description: 'HelperBot gives detailed, friendly support with --tone options and documents limitations for uploaded files.',
  profilePictureUrl: 'https://cdn.example.com/helperbot.png',
  isVerified: true,
  followerCount: 12345,
});

assert.deepEqual(analyzeBotName(metadata), {
  score: 100,
  details: 'Name formatting follows good practices',
});

const descriptionResults = analyzeDescription(metadata);
assert.equal(descriptionResults.length, 3);
assert.deepEqual(
  descriptionResults.map(result => [result.name, result.status, result.score]),
  [
    ['Description clarity for non-technical users', 'passed', 85],
    ['Advanced behavior documentation', 'passed', 90],
    ['Limitation documentation', 'passed', 85],
  ]
);

const sparseDescriptionResults = analyzeDescription({ ...metadata, description: 'short' });
assert.deepEqual(
  sparseDescriptionResults.map(result => [result.status, result.score]),
  [
    ['failed', 40],
    ['failed', 60],
    ['failed', 70],
  ]
);

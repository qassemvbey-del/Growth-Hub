const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

async function testWithKey(apiKey, name) {
  console.log(`\n--- Testing with key ${name}: ${apiKey} ---`);
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent("Hello! Response in 2 words.");
    console.log(`Success with key ${name}:`, result.response.text());
  } catch (error) {
    console.error(`Error with key ${name}:`, error.message || error);
  }
}

async function run() {
  await testWithKey(env.NEXT_PUBLIC_GEMINI_API_KEY, 'NEXT_PUBLIC_GEMINI_API_KEY');
  await testWithKey(env.NEXT_PUBLIC_GOOGLE_API_KEY, 'NEXT_PUBLIC_GOOGLE_API_KEY');
  await testWithKey(env.YOUTUBE_DATA_API_KEY, 'YOUTUBE_DATA_API_KEY');
}

run();

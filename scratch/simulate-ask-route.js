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

const apiKey = env.NEXT_PUBLIC_GEMINI_API_KEY;

async function simulateAskRoute() {
  console.log("Simulating ask route fallback loop...");
  const fallbackModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
  let result = null;
  let lastError = null;

  for (const modelName of fallbackModels) {
    try {
      console.log(`Trying model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
        }
      });
      result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: "Hello! Response in 2 words." }]
          }
        ]
      });
      console.log(`Success with model ${modelName}!`);
      break;
    } catch (error) {
      console.error(`Caught error for ${modelName}:`, error.message);
      lastError = error;
      const errMsg = error.message?.toLowerCase() || "";
      if (errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("404") || errMsg.includes("not found") || errMsg.includes("overloaded") || errMsg.includes("rate limit")) {
        console.warn(`[AI Fallback] Model ${modelName} failed. Trying next candidate...`);
        continue;
      } else {
        console.error(`Fatal model error for ${modelName}, throwing...`);
        throw error;
      }
    }
  }

  if (!result) {
    throw new Error(`All fallback models failed. Last API Error: ${lastError?.message || String(lastError)}`);
  }
}

simulateAskRoute().catch(err => {
  console.error("\nSimulate ASK route failed with:", err.message);
});

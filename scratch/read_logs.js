const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:/Users/M/.gemini/antigravity-ide/brain/101e35aa-6a98-41b7-ad95-4ce9a404b6bc/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('execute_sql')) {
      console.log(line.substring(0, 1000)); // print first 1000 chars of each match
    }
  }
}

run();

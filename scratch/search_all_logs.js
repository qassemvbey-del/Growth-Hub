const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function searchFile(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (line.includes('execute_sql') || line.includes('list_tables')) {
      console.log(`Match in ${filePath} line ${lineCount}:`);
      console.log(line.substring(0, 1500));
    }
  }
}

async function run() {
  const brainDir = 'C:/Users/M/.gemini/antigravity-ide/brain';
  const folders = fs.readdirSync(brainDir);
  for (const folder of folders) {
    const logPath = path.join(brainDir, folder, '.system_generated', 'logs', 'transcript.jsonl');
    if (fs.existsSync(logPath)) {
      try {
        await searchFile(logPath);
      } catch (e) {
        // ignore errors
      }
    }
  }
}

run();

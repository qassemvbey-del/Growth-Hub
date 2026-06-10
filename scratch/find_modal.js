const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'cyberpunk-growth-hub', 'src', 'app', 'goals', 'squad', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('showJoinGoal') || line.includes('JOIN_A_SQUAD')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

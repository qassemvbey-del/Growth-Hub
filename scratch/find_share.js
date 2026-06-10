const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'cyberpunk-growth-hub', 'src', 'app', 'goals', 'squad', '[id]', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('Share') || line.includes('share') || line.includes('invite')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

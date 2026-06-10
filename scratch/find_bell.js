const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'cyberpunk-growth-hub', 'src', 'components', 'layout', 'Shell.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('bell') || line.includes('notification') || line.includes('Accept') || line.includes('Reject')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

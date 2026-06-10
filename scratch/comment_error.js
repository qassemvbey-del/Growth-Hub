const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'cyberpunk-growth-hub', 'src', 'app', 'goals', 'public', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

let inComment = false;
const newLines = lines.map((line, idx) => {
  // Let's find where the comment starts
  if (line.trim() === '/*' && idx > 295 && idx < 320) {
    inComment = true;
    return '// ' + line;
  }
  if (inComment) {
    if (line.trim() === '*/') {
      inComment = false;
      return '// ' + line;
    }
    return '// ' + line;
  }
  return line;
});

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Successfully commented out error block line-by-line');

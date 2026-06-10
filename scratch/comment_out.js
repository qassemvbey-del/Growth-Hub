const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'cyberpunk-growth-hub', 'src', 'app', 'goals', 'public', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the block starting with "  /*" and ending with "  */" around those lines
const startBlock = '  /*\r\n  return (\r\n    <div className="min-h-screen';
const endBlock = '  )*/'; // Wait, let's check what the actual text is. It was "  )\r\n  */"

// Let's do a precise match or read lines and comment out between the indices.
const lines = content.split(/\r?\n/);
let inComment = false;
const newLines = lines.map((line, idx) => {
  // Line index 162 in 1-based index (0-based 162 is line 163)
  if (line.trim() === '/*' && idx < 200 && idx > 155) {
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
console.log('Successfully commented out block line-by-line');

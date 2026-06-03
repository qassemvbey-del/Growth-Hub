const fs = require('fs');
const path = require('path');

const arabicRegex = /[\u0600-\u06FF]/;
const rootDir = path.join(__dirname, '../src');

function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        scanDirectory(fullPath, fileList);
      }
    } else {
      if (/\.(ts|tsx|js|jsx|json|sql|html)$/.test(file)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function main() {
  const allFiles = scanDirectory(rootDir);
  const baseDir = path.join(__dirname, '..');
  
  // Also add schema.sql
  const schemaSql = path.join(baseDir, 'supabase/schema.sql');
  if (fs.existsSync(schemaSql)) {
    allFiles.push(schemaSql);
  }

  let output = '';
  let matchCount = 0;

  allFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (arabicRegex.test(line)) {
        const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
        output += `File: ${relativePath}\n`;
        output += `Line: ${idx + 1}\n`;
        output += `Text: "${line.trim()}"\n\n`;
        matchCount++;
      }
    });
  });

  fs.writeFileSync(path.join(baseDir, 'scratch/arabic_strings.txt'), output, 'utf8');
  console.log(`Successfully extracted ${matchCount} matches to scratch/arabic_strings.txt`);
}

main();

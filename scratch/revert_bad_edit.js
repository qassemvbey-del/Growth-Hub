const fs = require('fs');
const path = 'c:/Users/M/.gemini/antigravity/scratch/cyberpunk-growth-hub/src/app/goals/squad/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replacement 1: Task Card Container
const target1 = '"group flex flex-col p-4 md:p-5 border border-[var(--card-border)] rounded-md cursor-pointer hover:border-cyan-500/50 hover:bg-white/5 hover:scale-[1.01] transition-all duration-300 shadow-sm space-y-3 relative"';
const replace1 = `// Commented out per rule "Never delete code, only comment it out"
                            // "group flex flex-col p-4 md:p-5 border border-[var(--card-border)] rounded-md cursor-pointer hover:border-cyan-500/50 hover:bg-white/5 hover:scale-[1.01] transition-all duration-300 shadow-sm space-y-3 relative",
                            "group flex flex-col p-4 md:p-5 bg-[var(--card)] border border-[var(--border)] dark:border-[var(--card-border)] dark:bg-transparent rounded-md cursor-pointer hover:border-cyan-500/50 hover:bg-white/5 hover:scale-[1.01] transition-all duration-300 shadow-sm space-y-3 relative"`;

let success = true;

if (code.includes(target1)) {
  code = code.replace(target1, replace1);
  console.log('REPLACEMENT 1: SUCCESS');
} else {
  console.log('REPLACEMENT 1: TARGET NOT FOUND');
  success = false;
}

// Replacement 2: Task Card Title Span (using loose index search)
const matchText = 'text-base md:text-[17px] font-space font-bold tracking-tight transition-all duration-300 ease-in-out';
const matchIdx = code.indexOf(matchText);
if (matchIdx !== -1) {
  const startSpan = code.lastIndexOf('<span className={cn(', matchIdx);
  if (startSpan !== -1 && startSpan > matchIdx - 200) {
    const endSpan = code.indexOf(')}', matchIdx);
    if (endSpan !== -1 && endSpan < matchIdx + 400) {
      const originalSpan = code.slice(startSpan, endSpan + 2);
      
      // Let's create the replacement span by replacing "text-white" with "text-[var(--text-primary)] dark:text-white"
      const newSpan = originalSpan.replace('"text-white"', '"text-[var(--text-primary)] dark:text-white"');
      
      const replace2 = `{/* Commented out per rule "Never delete code, only comment it out"
                                ${originalSpan}
                                */}
                                ${newSpan}`;
      code = code.slice(0, startSpan) + replace2 + code.slice(endSpan + 2);
      console.log('REPLACEMENT 2: SUCCESS');
    } else {
      console.log('REPLACEMENT 2: endSpan not found');
      success = false;
    }
  } else {
    console.log('REPLACEMENT 2: startSpan not found');
    success = false;
  }
} else {
  console.log('REPLACEMENT 2: matchText not found');
  success = false;
}

if (success) {
  fs.writeFileSync(path, code, 'utf8');
  console.log('ALL EDITS WRITTEN TO FILE');
} else {
  console.log('ABORTING WRITE - TARGETS NOT MET');
}

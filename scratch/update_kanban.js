const fs = require('fs');
const path = 'c:/Users/M/.gemini/antigravity/scratch/cyberpunk-growth-hub/src/components/ui/KanbanBoard.tsx';
let code = fs.readFileSync(path, 'utf8');

let success = true;

// Replacement 1: Column Background
const matchText1 = 'bg-zinc-950/40 border border-white/5 backdrop-blur-md relative overflow-hidden w-[80vw]';
const matchIdx1 = code.indexOf(matchText1);
if (matchIdx1 !== -1) {
  const startIdx = code.lastIndexOf('className={cn(', matchIdx1);
  if (startIdx !== -1 && startIdx > matchIdx1 - 200) {
    const endIdx = code.indexOf(')}', matchIdx1);
    if (endIdx !== -1 && endIdx < matchIdx1 + 300) {
      const originalBlock = code.slice(startIdx, endIdx + 2);
      const replacement = `/* Commented out per rule "Never delete code, only comment it out"
            ${originalBlock}
            */
            className={cn(
              "flex flex-col gap-4 p-4 rounded-2xl min-h-[500px] lg:min-h-[550px] transition-all duration-300 bg-[var(--background-secondary)] dark:bg-zinc-950/40 border border-[var(--border)] dark:border-white/5 backdrop-blur-md relative overflow-hidden w-[80vw] lg:w-auto shrink-0 snap-center lg:shrink",
              isOver ? "border-dashed" : ""
            )}`;
      code = code.slice(0, startIdx) + replacement + code.slice(endIdx + 2);
      console.log('REPLACEMENT 1: SUCCESS');
    } else {
      console.log('REPLACEMENT 1: endIdx not found');
      success = false;
    }
  } else {
    console.log('REPLACEMENT 1: startIdx not found');
    success = false;
  }
} else {
  console.log('REPLACEMENT 1: NOT FOUND');
  success = false;
}

// Replacement 2: Sticky Header Background
const target2 = `            <div className="sticky top-0 bg-[#09090f]/95 backdrop-blur-md flex items-center justify-between pb-3 border-b border-white/5 shrink-0 z-10 pt-1">`;
const replace2 = `            {/* Commented out per rule "Never delete code, only comment it out"
            <div className="sticky top-0 bg-[#09090f]/95 backdrop-blur-md flex items-center justify-between pb-3 border-b border-white/5 shrink-0 z-10 pt-1">
            */}
            <div className="sticky top-0 bg-[var(--background-secondary)]/95 dark:bg-[#09090f]/95 backdrop-blur-md flex items-center justify-between pb-3 border-b border-[var(--border)] dark:border-white/5 shrink-0 z-10 pt-1">`;
const target2LF = target2.replace(/\r\n/g, '\n');
const replace2LF = replace2.replace(/\r\n/g, '\n');
if (code.includes(target2)) {
  code = code.replace(target2, replace2);
  console.log('REPLACEMENT 2: SUCCESS');
} else if (code.includes(target2LF)) {
  code = code.replace(target2LF, replace2LF);
  console.log('REPLACEMENT 2: SUCCESS');
} else {
  console.log('REPLACEMENT 2: NOT FOUND');
  success = false;
}

// Replacement 3: Card Container
const matchText3 = 'bg-zinc-900/40 border-white/5';
const matchIdx3 = code.indexOf(matchText3);
if (matchIdx3 !== -1) {
  const startIdx = code.lastIndexOf('className={cn(', matchIdx3);
  if (startIdx !== -1 && startIdx > matchIdx3 - 500) {
    const endIdx = code.indexOf(')}', matchIdx3);
    if (endIdx !== -1 && endIdx < matchIdx3 + 300) {
      const originalBlock = code.slice(startIdx, endIdx + 2);
      const replacement = `/* Commented out per rule "Never delete code, only comment it out"
                        ${originalBlock}
                        */
                        className={cn(
                          "p-3 rounded-lg border cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all shadow-sm flex items-center justify-between gap-2.5 relative overflow-hidden select-none bg-[var(--card)] border-[var(--border)] text-[var(--text-primary)] dark:bg-zinc-900/40 dark:border-white/5 dark:text-zinc-200",
                          isDragging ? "opacity-20 scale-95 border-dashed border-white/20" : "opacity-100",
                          task.is_completed ? "opacity-50" : ""
                        )}`;
      code = code.slice(0, startIdx) + replacement + code.slice(endIdx + 2);
      console.log('REPLACEMENT 3: SUCCESS');
    } else {
      console.log('REPLACEMENT 3: endIdx not found');
      success = false;
    }
  } else {
    console.log('REPLACEMENT 3: startIdx not found');
    success = false;
  }
} else {
  console.log('REPLACEMENT 3: NOT FOUND');
  success = false;
}

// Replacement 4: Title Span
const matchText4 = 'text-sm font-medium text-zinc-200 truncate';
const matchIdx4 = code.indexOf(matchText4);
if (matchIdx4 !== -1) {
  const startIdx = code.lastIndexOf('<span', matchIdx4);
  if (startIdx !== -1 && startIdx > matchIdx4 - 200) {
    const endIdx = code.indexOf('>', matchIdx4);
    if (endIdx !== -1 && endIdx < matchIdx4 + 200) {
      const originalBlock = code.slice(startIdx, endIdx + 1);
      const replacement = `{/* Commented out per rule "Never delete code, only comment it out"
                          ${originalBlock}
                          */}
                          <span 
                            className={cn(
                              "text-sm font-medium text-[var(--text-primary)] dark:text-zinc-200 truncate",
                              task.is_completed && "text-zinc-500 line-through opacity-55"
                            )}
                          >`;
      code = code.slice(0, startIdx) + replacement + code.slice(endIdx + 1);
      console.log('REPLACEMENT 4: SUCCESS');
    } else {
      console.log('REPLACEMENT 4: endIdx not found');
      success = false;
    }
  } else {
    console.log('REPLACEMENT 4: startIdx not found');
    success = false;
  }
} else {
  console.log('REPLACEMENT 4: NOT FOUND');
  success = false;
}

if (success) {
  fs.writeFileSync(path, code, 'utf8');
  console.log('ALL EDITS WRITTEN');
} else {
  console.log('ABORTED WRITE');
}

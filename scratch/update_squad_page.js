const fs = require('fs');
const path = 'c:/Users/M/.gemini/antigravity/scratch/cyberpunk-growth-hub/src/app/goals/squad/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replacement 1: Task Card Container
const target1 = '"group flex flex-col p-4 md:p-5 bg-[var(--card)] border border-[var(--border)] dark:border-[var(--card-border)] dark:bg-transparent rounded-md cursor-pointer hover:border-cyan-500/50 hover:bg-white/5 hover:scale-[1.01] transition-all duration-300 shadow-sm space-y-3 relative"';
const replace1 = `/* Commented out per safety rules:
                             "group flex flex-col p-4 md:p-5 bg-[var(--card)] border border-[var(--border)] dark:border-[var(--card-border)] dark:bg-transparent rounded-md cursor-pointer hover:border-cyan-500/50 hover:bg-white/5 hover:scale-[1.01] transition-all duration-300 shadow-sm space-y-3 relative",
                             */
                             "group flex flex-col p-4 md:p-5 bg-[var(--card)] border border-[var(--border)] dark:border-white/10 rounded-xl cursor-pointer hover:border-cyan-500/50 hover:bg-white/5 hover:scale-[1.01] transition-all duration-300 shadow-sm space-y-3 relative"`;

let success = true;

if (code.includes(target1)) {
  code = code.replace(target1, replace1);
  console.log('REPLACEMENT 1: SUCCESS');
} else {
  console.log('REPLACEMENT 1: TARGET NOT FOUND');
  success = false;
}

function doReplace(target, replacement) {
  const normTarget = target.replace(/\r\n/g, '\n');
  const normReplacement = replacement.replace(/\r\n/g, '\n');
  
  // We will do a search with normalized newlines
  const normCode = code.replace(/\r\n/g, '\n');
  const index = normCode.indexOf(normTarget);
  if (index !== -1) {
    // We found it! We must locate the exact boundary in the original code
    // Since replacing \r\n with \n might shift indices if we are not careful,
    // let's do a simple regex-like replacement.
    // An easy way is to replace target where newlines can be \r\n or \n.
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = escapeRegExp(normTarget).replace(/\n/g, '\\r?\\n');
    const regex = new RegExp(regexStr);
    code = code.replace(regex, replacement);
    return true;
  }
  return false;
}

// Replacement 2: PIN button styling
const target2 = `              <button 
                 onClick={() => { 
                    playBlip(); 
                    const nextVal = !mission.sync_to_dashboard;
                    updateMission({ sync_to_dashboard: nextVal }); 
                    if (nextVal) {
                      window.dispatchEvent(new CustomEvent('onboarding-action', { detail: 'pin' }));
                    }
                 }}
                 className="flex flex-col items-center justify-center p-2 transition-colors cursor-pointer text-zinc-400 hover:text-white"`;

const replace2 = `              {/* Commented out per safety rules:
              <button 
                 onClick={() => { 
                    playBlip(); 
                    const nextVal = !mission.sync_to_dashboard;
                    updateMission({ sync_to_dashboard: nextVal }); 
                    if (nextVal) {
                      window.dispatchEvent(new CustomEvent('onboarding-action', { detail: 'pin' }));
                    }
                 }}
                 className="flex flex-col items-center justify-center p-2 transition-colors cursor-pointer text-zinc-400 hover:text-white"
              */}
              <button 
                 onClick={() => { 
                    playBlip(); 
                    const nextVal = !mission.sync_to_dashboard;
                    updateMission({ sync_to_dashboard: nextVal }); 
                    if (nextVal) {
                      window.dispatchEvent(new CustomEvent('onboarding-action', { detail: 'pin' }));
                    }
                 }}
                 className="flex flex-col items-center justify-center p-2 transition-colors cursor-pointer text-[var(--text-secondary)] dark:text-zinc-400 hover:text-[var(--text-primary)] dark:hover:text-white font-medium"`;

if (doReplace(target2, replace2)) {
  console.log('REPLACEMENT 2: SUCCESS');
} else {
  console.log('REPLACEMENT 2: TARGET NOT FOUND');
  success = false;
}

// Replacement 3: IMPORT Button styling
const target3 = `                <button
                   onClick={() => { playBlip(); setShowImportDropdown(!showImportDropdown); }}
                   className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"`;

const replace3 = `                {/* Commented out per safety rules:
                <button
                   onClick={() => { playBlip(); setShowImportDropdown(!showImportDropdown); }}
                   className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                */}
                <button
                   onClick={() => { playBlip(); setShowImportDropdown(!showImportDropdown); }}
                   className="flex flex-col items-center justify-center p-2 text-[var(--text-secondary)] dark:text-zinc-400 hover:text-[var(--text-primary)] dark:hover:text-white transition-colors cursor-pointer font-medium"`;

if (doReplace(target3, replace3)) {
  console.log('REPLACEMENT 3: SUCCESS');
} else {
  console.log('REPLACEMENT 3: TARGET NOT FOUND');
  success = false;
}

// Replacement 4: NOTES button styling
const target4 = `              <button
                onClick={() => { playBlip(); setShowIntelModal(true); }}
                className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer relative"`;

const replace4 = `              {/* Commented out per safety rules:
              <button
                onClick={() => { playBlip(); setShowIntelModal(true); }}
                className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer relative"
              */}
              <button
                onClick={() => { playBlip(); setShowIntelModal(true); }}
                className="flex flex-col items-center justify-center p-2 text-[var(--text-secondary)] dark:text-zinc-400 hover:text-[var(--text-primary)] dark:hover:text-white transition-colors cursor-pointer relative font-medium"`;

if (doReplace(target4, replace4)) {
  console.log('REPLACEMENT 4: SUCCESS');
} else {
  console.log('REPLACEMENT 4: TARGET NOT FOUND');
  success = false;
}

// Replacement 5: SHARE button styling
const target5 = `              <button
                 onClick={handleShare}
                 className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"`;

const replace5 = `              {/* Commented out per safety rules:
              <button
                 onClick={handleShare}
                 className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              */}
              <button
                 onClick={handleShare}
                 className="flex flex-col items-center justify-center p-2 text-[var(--text-secondary)] dark:text-zinc-400 hover:text-[var(--text-primary)] dark:hover:text-white transition-colors cursor-pointer font-medium"`;

if (doReplace(target5, replace5)) {
  console.log('REPLACEMENT 5: SUCCESS');
} else {
  console.log('REPLACEMENT 5: TARGET NOT FOUND');
  success = false;
}

if (success) {
  fs.writeFileSync(path, code, 'utf8');
  console.log('ALL EDITS WRITTEN TO FILE');
} else {
  console.log('ABORTING WRITE - TARGETS NOT MET');
}

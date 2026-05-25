import re
import os

def replace_with_regex(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match span with material-symbols-outlined containing smart_display and play_circle
    pattern = r'<span\s+className="material-symbols-outlined text-lg">\s*\{\s*selectedTask\?\.id\s*===\s*task\.id\s*\?\s*\'smart_display\'\s*:\s*\'play_circle\'\s*\}\s*</span>'
    
    replacement = """{selectedTask?.id === task.id ? (
                                      <Tv className="w-4 h-4 mx-auto" />
                                    ) : (
                                      <Play className="w-4 h-4 mx-auto" />
                                    )}"""
    
    new_content, count = re.subn(pattern, replacement, content)
    if count > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully replaced {count} occurrence(s) in {file_path}")
    else:
        print(f"Target pattern not found in {file_path}")

replace_with_regex(r"c:\Users\M\.gemini\antigravity\scratch\cyberpunk-growth-hub\src\app\goals\squad\[id]\page.tsx")
replace_with_regex(r"c:\Users\M\.gemini\antigravity\scratch\cyberpunk-growth-hub\src\app\missions\[id]\page.tsx")

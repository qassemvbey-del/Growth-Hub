const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'cyberpunk-growth-hub/src/app/missions/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Target string to replace (using regex to ignore exact whitespace style of tabs vs spaces)
const regex = /\/\*\s*Progress\s*line\s*below\s*detail\s*row\s*spanning\s*full\s*width\s*of\s*the\s*card\s*\*\/[\s\S]*?\{\s*\(\s*hasVideo\s*&&\s*videoDuration\s*>\s*0\s*\)\s*\?\s*\([\s\S]*?style=\{\s*\{\s*backgroundColor:\s*['"]#00E5FF['"],\s*boxShadow:\s*['"]0\s*0\s*6px\s*#00E5FF['"]\s*\}\s*\}[\s\S]*?\)\s*:\s*null\s*\}[\s\S]*?<\/motion\.div>/;

const replacement = "/* Progress line below detail row spanning full width of the card */\n" +
"                        {(hasVideo && videoDuration > 0) ? (\n" +
"                          <div className=\"relative h-[2px] mt-1 bg-white/5 rounded-full overflow-hidden w-full\">\n" +
"                            <motion.div\n" +
"                              initial={{ width: 0 }}\n" +
"                              animate={{ width: `${videoProgressPct}%` }}\n" +
"                              transition={{ duration: 0.4 }}\n" +
"                              className=\"h-full absolute top-0 left-0 rounded-full\"\n" +
"                              style={{ \n" +
"                                backgroundColor: currentTheme.color, \n" +
"                                boxShadow: `0 0 6px ${currentTheme.color}` \n" +
"                              }}\n" +
"                            />\n" +
"                          </div>\n" +
"                        ) : null}\n" +
"\n" +
"                        {/* Collapsible video player container */}\n" +
"                        {expandedTaskId === task.id && hasVideo && (\n" +
"                          <motion.div\n" +
"                            initial={{ opacity: 0, height: 0 }}\n" +
"                            animate={{ opacity: 1, height: 'auto' }}\n" +
"                            exit={{ opacity: 0, height: 0 }}\n" +
"                            transition={{ duration: 0.3 }}\n" +
"                            className=\"w-full mt-2 overflow-hidden\"\n" +
"                          >\n" +
"                            <SmartTaskPlayer\n" +
"                              taskId={task.id}\n" +
"                              videoId={task.video_id || getYouTubeId(task.video_url || '')}\n" +
"                              initialProgress={videoProgress}\n" +
"                              isGuest={typeof id === 'string' && id.startsWith('local_')}\n" +
"                              themeColor={currentTheme.color}\n" +
"                              onComplete={() => {\n" +
"                                if (!task.is_completed) {\n" +
"                                  toggleTask(task.id, false)\n" +
"                                }\n" +
"                              }}\n" +
"                              onProgressUpdate={(currentTime, duration) => {\n" +
"                                updateTaskProgress(task.id, currentTime, duration)\n" +
"                              }}\n" +
"                            />\n" +
"                          </motion.div>\n" +
"                        )}\n" +
"                      </motion.div>";

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('REPLACEMENT SUCCESSFUL');
} else {
  console.log('PATTERN NOT FOUND');
}

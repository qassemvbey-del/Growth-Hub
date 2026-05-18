// src/lib/profanityFilter.ts
const BAD_WORDS_EN = ["fuck", "shit", "bitch", "asshole", "cunt", "dick", "pussy", "bastard", "slut", "whore", "nigger", "faggot", "motherfucker"];
const BAD_WORDS_AR = ["شرموط", "متناك", "عرص", "خرا", "خول", "قحبة", "كس", "زبر", "لبوة", "ابن المتناكة", "ابن الاحبة", "احبة", "منيوك"]; 

export function validateContent(text: string): { isValid: boolean, sanitizedText: string } {
  if (!text) return { isValid: true, sanitizedText: "" };
  
  let isValid = true;
  let sanitizedText = text;
  
  const allBadWords = [...BAD_WORDS_EN, ...BAD_WORDS_AR];
  
  for (const word of allBadWords) {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, "gi");
    if (regex.test(sanitizedText)) {
      isValid = false;
      sanitizedText = sanitizedText.replace(regex, "***");
    }
  }
  
  for (const word of BAD_WORDS_AR) {
    if (sanitizedText.includes(word)) {
      isValid = false;
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedWord, "gi");
      sanitizedText = sanitizedText.replace(regex, "***");
    }
  }

  return { isValid, sanitizedText };
}

// lib/textUtils.js - Smart spelling auto-correction and capitalization (capital/small letter) normalization

/**
 * Common English typos and misspellings frequently made in to-do items and notes.
 */
export const COMMON_TYPOS = {
  // Relative time & date typos
  tommorow: "tomorrow",
  tommorrow: "tomorrow",
  tomorow: "tomorrow",
  tommow: "tomorrow",
  tmrw: "tomorrow",
  tomo: "tomorrow",
  tody: "today",
  tday: "today",
  todat: "today",
  tonite: "tonight",
  yeasterday: "yesterday",
  yesturday: "yesterday",
  yday: "yesterday",
  janurary: "january",
  feburary: "february",
  sepetember: "september",
  septmber: "september",
  octomber: "october",
  decemeber: "december",
  mondy: "monday",
  monady: "monday",
  tuesdy: "tuesday",
  tues: "tuesday",
  wednesdy: "wednesday",
  wednessday: "wednesday",
  wensday: "wednesday",
  thursdy: "thursday",
  thrusday: "thursday",
  thurday: "thursday",
  fridat: "friday",
  fridy: "friday",
  firday: "friday",
  saturdy: "saturday",
  saterday: "saturday",
  sundy: "sunday",

  // Common user typos
  alos: "also",
  aslo: "also",
  accoridngly: "accordingly",
  acordingly: "accordingly",
  scheudle: "schedule",
  schedul: "schedule",
  skedule: "schedule",
  meating: "meeting",
  documnet: "document",
  docuemnt: "document",
  presenation: "presentation",
  presentaion: "presentation",
  preperation: "preparation",
  prepration: "preparation",
  recieved: "received",
  receve: "receive",
  seperate: "separate",
  definately: "definitely",
  definatly: "definitely",
  untill: "until",
  calender: "calendar",
  reivew: "review",
  reveiw: "review",
  delte: "delete",
  delet: "delete",
  databse: "database",
  databae: "database",
  immediatly: "immediately",
  immedaitely: "immediately",
  maintainance: "maintenance",
  maintanance: "maintenance",
  accomodate: "accommodate",
  assignement: "assignment",
  goverment: "government",
  restaraunt: "restaurant",
  resturant: "restaurant",
  writting: "writing",
  attendence: "attendance",
  collegue: "colleague",
  collaegue: "colleague",
  occured: "occurred",
  connet: "connect",
  conncet: "connect",
  comfirm: "confirm",
  cancle: "cancel",
  sucess: "success",
  succes: "success",
  compleat: "complete",
  complet: "complete",
};

/**
 * Acronyms that should remain fully uppercase.
 */
const ACRONYMS = new Set([
  "API", "SSL", "CPU", "AWS", "S3", "PR", "UI", "UX", "ID", "DB", "EOD",
  "CEO", "CTO", "CFO", "HR", "SQL", "DNS", "URL", "HTTP", "HTTPS", "JSON",
  "HTML", "CSS", "JS", "TS", "REST", "SDK", "SDKs", "LLM", "AI", "PDF"
]);

/**
 * Fixes common spelling mistakes in text while respecting the word's original case.
 */
export function correctCommonSpelling(rawText) {
  if (!rawText || typeof rawText !== "string") return "";

  let text = rawText;

  // 1. Phrasal typos
  text = text.replace(/\bin\s+a\s+weak\b/gi, "in a week");
  text = text.replace(/\bin\s+1\s+weak\b/gi, "in 1 week");
  text = text.replace(/\bnext\s+weak\b/gi, "next week");
  text = text.replace(/\bnxt\s+week\b/gi, "next week");
  text = text.replace(/\bnxt\s+weak\b/gi, "next week");

  // 2. Technical acronym auto-capitalization (e.g. pdf -> PDF, api -> API)
  text = text.replace(/\b(pdf|api|ssl|cpu|aws|pr|ui|ux|eod|url|json|html|css)\b/gi, (match) => {
    return match.toUpperCase();
  });

  // 3. Individual word typos
  text = text.replace(/\b[A-Za-z]+\b/g, (word) => {
    const lower = word.toLowerCase();
    if (COMMON_TYPOS[lower]) {
      const fixed = COMMON_TYPOS[lower];
      // If ALL CAPS: preserve ALL CAPS
      if (word === word.toUpperCase() && word.length > 1) {
        return fixed.toUpperCase();
      }
      // If TitleCase: preserve TitleCase
      if (word[0] === word[0].toUpperCase()) {
        return fixed.charAt(0).toUpperCase() + fixed.slice(1);
      }
      return fixed;
    }
    return word;
  });

  return text;
}

/**
 * Fixes capital and small letter issues (capitalization / sentence casing):
 * - If user typed in ALL CAPS (shouting), converts to sentence case while preserving known acronyms.
 * - If user typed in all lowercase, capitalizes the first alphabetical character.
 * - Preserves technical terms and acronyms (API, PR, AWS, etc.).
 */
export function formatTaskCapitalization(rawText) {
  if (!rawText || typeof rawText !== "string") return "";

  let text = rawText.trim();
  if (!text) return "";

  // Check if text is predominantly UPPERCASE (shouting / accidental caps-lock)
  const lettersOnly = text.replace(/[^a-zA-Z]/g, "");
  const isShouting = lettersOnly.length > 4 && lettersOnly === lettersOnly.toUpperCase();

  if (isShouting) {
    // Convert to lowercase words, restoring known acronyms
    const words = text.split(/\s+/);
    text = words
      .map((w) => {
        const clean = w.replace(/[^a-zA-Z]/g, "");
        if (ACRONYMS.has(clean.toUpperCase())) {
          return w; // keep acronym as-is
        }
        return w.toLowerCase();
      })
      .join(" ");
  }

  // Ensure first alphabetic character is Capitalized (Sentence Case)
  text = text.replace(/^([^a-zA-Z]*)([a-z])/, (_match, prefix, firstChar) => {
    return prefix + firstChar.toUpperCase();
  });

  return text;
}

/**
 * Comprehensive task text normalization:
 * 1. Corrects common spelling mistakes (e.g. "tommorow" -> "tomorrow", "delte" -> "delete").
 * 2. Fixes capital / small letter issues (sentence casing, auto-capitalization, deshouing).
 * 3. Trims redundant spaces.
 */
export function normalizeTaskText(rawText) {
  if (!rawText || typeof rawText !== "string") return "";
  const cleaned = rawText.replace(/\s+/g, " ").trim();
  const spellChecked = correctCommonSpelling(cleaned);
  return formatTaskCapitalization(spellChecked);
}

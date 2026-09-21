// lib/extractor.js - Splits notes, extracts candidate dates and candidate people

import { correctCommonSpelling } from "./textUtils.js";

const DAYS_OF_WEEK = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
  // Hindi & Hinglish Days
  somvar: 1,
  somwar: 1,
  mangalvar: 2,
  mangalwar: 2,
  budhvar: 3,
  budhwar: 3,
  guruvar: 4,
  guruwar: 4,
  veervar: 4,
  brihaspativar: 4,
  shukravar: 5,
  shukrawar: 5,
  shanivar: 6,
  shaniwar: 6,
  ravivar: 0,
  raviwar: 0,
  itvar: 0,
};

const MONTHS = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sept: 8, sep: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

const NUMBER_WORDS = {
  one: 1,
  a: 1,
  an: 1,
  two: 2,
  couple: 2,
  three: 3,
  few: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const COMMON_NON_NAMES = new Set([
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it", "they",
  "today", "tomorrow", "yesterday", "tonight", "eod", "asap",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "call", "send", "pay", "buy", "review", "check", "fix", "write", "clean",
  "finish", "organize", "update", "meet", "remind", "follow", "waiting", "need",
  "maybe", "remember", "ask", "see", "get", "do", "make", "take",
  "the", "a", "an", "this", "that", "these", "those", "then", "and", "or",
  "for", "to", "in", "on", "at", "by", "from", "with", "about", "before", "after",
  "pr", "deck", "contract", "rent", "budget", "invoice", "guitar", "dentist",
  "office", "home", "gym", "task", "note", "item"
]);

/**
 * Splits compound or multi-action notes into distinct actionable tasks.
 * Handles:
 * - Newlines (\r?\n)
 * - In-line numbered lists / bullets (1. ... 2. ..., - ... - ...)
 * - Semicolons (; )
 * - Sentence boundary delimiters (. followed by action verbs/capitals)
 * - Temporal & action transitions:
 *   - "and then", "and after that", "then"
 *   - "and will start", "and start", "and learn", "and watch", "and do", etc.
 *   - "and from tomorrow", "and tomorrow", "and next week"
 *   - "aur fir", "aur phir", "uske baad", "aur kal"
 */
export function splitCompoundTasks(text) {
  if (!text || typeof text !== "string") return [];

  // 1. Initial split by newlines
  const rawChunks = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  function splitChunk(chunk) {
    // 2. Numbered or bullet lists on a single line: e.g. "1. Task A 2. Task B" or "- Task A - Task B"
    const sub = chunk.replace(/(?:^|\s)(?:\d+[\.\)]|[-*•])\s+/g, "\n");
    const pieces = sub.split(/\n/).map((s) => s.trim()).filter(Boolean);

    const refined = [];
    for (const p of pieces) {
      // 3. Sentence boundary split (. followed by capital or action verb)
      const sentenceSplit = p.split(
        /(?<=[a-zA-Z0-9\)])\.\s+(?=[A-Z0-9]|\b(?:buy|call|email|send|check|read|write|learn|start|watch|finish|deploy|meet|do|clean|fix)\b)/
      );

      for (const sPart of sentenceSplit) {
        // 4. Semicolon split
        const semiSplit = sPart.split(/;\s+/).map((s) => s.trim()).filter(Boolean);
        for (const s of semiSplit) {
          // 5. Sequential connectors:
          const connectorRegex =
            /\b(?:and\s+then|then\s+also|and\s+after\s+that|after\s+that|aur\s+fir|aur\s+phir|uske\s+baad|and\s+(?:also\s+)?(?:will\s+|shall\s+|to\s+)?(?:start|learn|watch|read|call|email|send|buy|finish|complete|submit|prepare|write|code|deploy|practice|revise|do)|and\s+(?:from\s+)?(?:tomorrow|today|tonight|next\s+week))\b/gi;

          let lastIndex = 0;
          let match;
          const currentSegments = [];

          while ((match = connectorRegex.exec(s)) !== null) {
            const seg = s.slice(lastIndex, match.index).trim();
            if (seg.length > 5) {
              currentSegments.push(seg);
            }
            lastIndex = match.index;
          }
          const lastSeg = s.slice(lastIndex).trim();
          if (lastSeg.length > 0) {
            const cleanedLast = lastSeg
              .replace(
                /^(?:and\s+then|and\s+after\s+that|and\s+also|and\s+will\s+|and\s+|then\s+|aur\s+fir\s+|aur\s+phir\s+|aur\s+)\s*/i,
                ""
              )
              .trim();
            if (cleanedLast.length > 0) {
              currentSegments.push(cleanedLast);
            }
          }

          if (currentSegments.length > 1) {
            refined.push(...currentSegments);
          } else {
            refined.push(s);
          }
        }
      }
    }
    return refined;
  }

  const allTasks = [];
  for (const c of rawChunks) {
    const parts = splitChunk(c);
    for (let p of parts) {
      p = p.replace(/^[-*•\d+.)\]\s]+/, "").trim();
      p = p
        .replace(
          /^(?:and\s+then|and\s+after\s+that|and\s+also|and\s+will\s+|and\s+|then\s+|aur\s+fir\s+|aur\s+phir\s+|aur\s+)\s*/i,
          ""
        )
        .trim();
      if (p.length > 2) {
        allTasks.push(p);
      }
    }
  }

  return allTasks.length > 0 ? allTasks : [text.trim()];
}

/**
 * Split messy text into individual task lines/bullets, dropping empty ones.
 */
export function splitNotes(rawText) {
  if (!rawText || typeof rawText !== "string") return [];
  return splitCompoundTasks(rawText);
}

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Helper to calculate next upcoming day of week from reference date
 */
function getNextDayOfWeek(refDate, targetDayIndex, isNextModifier = false) {
  const date = new Date(refDate);
  const currentDay = date.getDay();
  let daysToAdd = (targetDayIndex - currentDay + 7) % 7;

  if (daysToAdd === 0) {
    daysToAdd = isNextModifier ? 7 : 7; // Next occurrence is 7 days if today is the target day
  } else if (isNextModifier && daysToAdd < 7) {
    daysToAdd += 7;
  }

  date.setDate(date.getDate() + daysToAdd);
  return date;
}

/**
 * Parse natural number or numeric word: '1', '2', 'a', 'one', 'couple', 'few', etc.
 */
function parseCount(word) {
  if (!word) return 1;
  const num = parseInt(word, 10);
  if (!isNaN(num)) return num;
  const lower = word.toLowerCase().trim();
  if (NUMBER_WORDS[lower] !== undefined) return NUMBER_WORDS[lower];
  return 1;
}

/**
 * Core natural date resolver.
 * Inspects a note text and detects explicit or relative temporal expressions:
 * - "today", "tonight", "due today", "eod", "this evening"
 * - "tomorrow", "tmrw", "by tomorrow", "due tomorrow"
 * - "day after tomorrow", "in 2 days"
 * - "in a week", "in 1 week", "in one week", "next week", "a week from now"
 * - "in N days", "in a few days", "in a couple days"
 * - "in N weeks"
 * - "in a month", "in 1 month", "next month"
 * - "end of week", "eow", "by Friday", "next Monday"
 * - Specific dates: "Sept 25", "2026-09-25", "9/25"
 *
 * Returns: { date: "YYYY-MM-DD", label: string, confidence: number, phrase: string } or null
 */
export function resolveNaturalDate(note, refDate = new Date()) {
  if (!note || typeof note !== "string") return null;

  const base = new Date(refDate);
  // Auto-correct common spelling mistakes (e.g. tommorow -> tomorrow, in a weak -> in a week)
  const corrected = correctCommonSpelling(note);
  const text = corrected.toLowerCase();

  // 1. "today" / "tonight" / "eod" / "this evening" / "this afternoon" / "this morning" / "aj" / "aaj" / "aaj hi"
  if (/\b(today|tonight|this\s+(evening|afternoon|morning)|eod|end\s+of\s+day|aj|aaj|aaj\s+hi|aaj\s+(shaam|raat|subah|dopahar)|आज)\b/i.test(text)) {
    return {
      date: formatDate(base),
      label: "Today",
      confidence: 0.95,
      phrase: "today",
    };
  }

  // 2. "day after tomorrow" / "parso" / "parson"
  if (/\b(day\s+after\s+tomorrow|parso|parson|परसों)\b/i.test(text)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 2);
    return {
      date: formatDate(d),
      label: "In 2 days",
      confidence: 0.95,
      phrase: "day after tomorrow",
    };
  }

  // 3. "in 3 days" / "tarso" / "tarson" / "narso"
  if (/\b(in\s+3\s+days|tarso|tarson|narso|narson)\b/i.test(text)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 3);
    return {
      date: formatDate(d),
      label: "In 3 days",
      confidence: 0.92,
      phrase: "in 3 days",
    };
  }

  // 4. "tomorrow" / "tmrw" / "kal" / "kal tak"
  if (/\b(tomorrow|tmrw|kal|kal\s+tak|kal\s+(shaam|raat|subah|dopahar)|कल)\b/i.test(text)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return {
      date: formatDate(d),
      label: "Tomorrow",
      confidence: 0.95,
      phrase: "tomorrow",
    };
  }

  // 5. "in a week", "in 1 week", "next week", "agle hafte", "agla hafta"
  const inWeekMatch =
    text.match(/\b(?:in\s+)?(a|an|one|\d+)?\s*weeks?(?:\s+from\s+now)?\b/i) ||
    text.match(/\b(next\s+week|agle\s+hafte|agla\s+hafta|agle\s+week|next\s+hafte|ek\s+hafte\s+me(?:in)?|1\s+hafte\s+me(?:in)?)\b/i);
  if (inWeekMatch) {
    const count = inWeekMatch[1] && parseCount(inWeekMatch[1]) ? parseCount(inWeekMatch[1]) : 1;
    const d = new Date(base);
    d.setDate(d.getDate() + count * 7);
    return {
      date: formatDate(d),
      label: count === 1 ? "In a week" : `In ${count} weeks`,
      confidence: 0.92,
      phrase: inWeekMatch[0],
    };
  }

  // 6. "in a day", "in 2 days", "in a few days", "in a couple days"
  const inDaysMatch = text.match(/\bin\s+(a|an|one|two|three|few|couple|\d+)\s+days?\b/i);
  if (inDaysMatch) {
    const count = parseCount(inDaysMatch[1]);
    const d = new Date(base);
    d.setDate(d.getDate() + count);
    return {
      date: formatDate(d),
      label: count === 1 ? "Tomorrow" : `In ${count} days`,
      confidence: 0.92,
      phrase: inDaysMatch[0],
    };
  }

  // 7. "in a month", "next month", "in N months", "agle mahine"
  const inMonthMatch =
    text.match(/\b(?:in\s+)?(a|an|one|\d+)?\s*months?(?:\s+from\s+now)?\b/i) ||
    text.match(/\b(next\s+month|agle\s+mahine|agla\s+mahina|agle\s+month|ek\s+mahine\s+me(?:in)?|1\s+mahine\s+me(?:in)?)\b/i);
  if (inMonthMatch) {
    const count = inMonthMatch[1] && parseCount(inMonthMatch[1]) ? parseCount(inMonthMatch[1]) : 1;
    const d = new Date(base);
    d.setMonth(d.getMonth() + count);
    return {
      date: formatDate(d),
      label: count === 1 ? "In a month" : `In ${count} months`,
      confidence: 0.88,
      phrase: inMonthMatch[0],
    };
  }

  // 8. "end of week" / "end of the week" / "eow" -> upcoming Friday
  if (/\b(end\s+of\s+(?:the\s+)?week|eow)\b/i.test(text)) {
    const resolved = getNextDayOfWeek(base, DAYS_OF_WEEK.friday);
    return {
      date: formatDate(resolved),
      label: "End of week",
      confidence: 0.90,
      phrase: "end of week",
    };
  }

  // 9. Named Day of week: "Friday", "by Friday", "next Monday", "somvar", "shukravar"
  const dayNamesPattern = Object.keys(DAYS_OF_WEEK).join("|");
  const dayRegex = new RegExp(`\\b(?:(next|this|by|due|on|agle)\\s+)?(${dayNamesPattern})\\b`, "gi");
  const dayMatch = dayRegex.exec(text);
  if (dayMatch) {
    const modifier = (dayMatch[1] || "").toLowerCase();
    const dayName = dayMatch[2].toLowerCase();
    const targetIdx = DAYS_OF_WEEK[dayName];
    if (targetIdx !== undefined) {
      const resolved = getNextDayOfWeek(base, targetIdx, modifier === "next" || modifier === "agle");
      const dayCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      return {
        date: formatDate(resolved),
        label: modifier === "next" || modifier === "agle" ? `Next ${dayCap}` : dayCap,
        confidence: 0.90,
        phrase: dayMatch[0],
      };
    }
  }

  // 9. ISO standard date: "2026-09-25"
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, "0");
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, "0");
    return {
      date: `${y}-${m}-${d}`,
      label: `${y}-${m}-${d}`,
      confidence: 0.98,
      phrase: isoMatch[0],
    };
  }

  // 10. Month and Day: "Sept 25", "September 25th", "25 Sept"
  const monthDayRegex = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/;
  const mdMatch = text.match(monthDayRegex);
  if (mdMatch) {
    const monthIdx = MONTHS[mdMatch[1]];
    const dayNum = parseInt(mdMatch[2], 10);
    let targetYear = base.getFullYear();
    const tentative = new Date(targetYear, monthIdx, dayNum);
    // If date has already passed by more than a week, assume next year
    if (tentative < base && (base - tentative) > 7 * 24 * 3600 * 1000) {
      targetYear += 1;
    }
    const finalDate = new Date(targetYear, monthIdx, dayNum);
    return {
      date: formatDate(finalDate),
      label: `${mdMatch[1].charAt(0).toUpperCase() + mdMatch[1].slice(1)} ${dayNum}`,
      confidence: 0.92,
      phrase: mdMatch[0],
    };
  }

  return null;
}

/**
 * Resolves candidate dates found in a note relative to a reference date.
 * Returns an object: { "date_1": "2026-09-25", "date_2": "..." }
 */
export function extractCandidateDates(note, refDate = new Date()) {
  const base = new Date(refDate);
  const candidates = {};
  const foundDates = new Set();
  let candidateIndex = 1;

  // 1. Primary natural date
  const primary = resolveNaturalDate(note, base);
  if (primary && primary.date) {
    candidates[`date_${candidateIndex++}`] = primary.date;
    foundDates.add(primary.date);
  }

  const corrected = correctCommonSpelling(note);
  const text = corrected.toLowerCase();

  // 2. Additional date passes to catch multiple dates if present

  // Today (English + Hindi / Hinglish)
  if (/\b(today|tonight|aj|aaj|aaj\s+hi|aaj\s+(shaam|raat|subah|dopahar)|आज)\b/i.test(text)) {
    const d = formatDate(base);
    if (!foundDates.has(d)) {
      candidates[`date_${candidateIndex++}`] = d;
      foundDates.add(d);
    }
  }

  // Tomorrow (English + Hindi / Hinglish)
  if (/\b(tomorrow|tmrw|kal|kal\s+tak|kal\s+(shaam|raat|subah|dopahar)|कल)\b/i.test(text)) {
    const tmrw = new Date(base);
    tmrw.setDate(tmrw.getDate() + 1);
    const d = formatDate(tmrw);
    if (!foundDates.has(d)) {
      candidates[`date_${candidateIndex++}`] = d;
      foundDates.add(d);
    }
  }

  // Day after tomorrow (English + Hindi / Hinglish)
  if (/\b(day\s+after\s+tomorrow|parso|parson|परसों)\b/i.test(text)) {
    const dat = new Date(base);
    dat.setDate(dat.getDate() + 2);
    const d = formatDate(dat);
    if (!foundDates.has(d)) {
      candidates[`date_${candidateIndex++}`] = d;
      foundDates.add(d);
    }
  }

  // In 3 days (tarso / narso)
  if (/\b(in\s+3\s+days|tarso|tarson|narso|narson)\b/i.test(text)) {
    const d3 = new Date(base);
    d3.setDate(d3.getDate() + 3);
    const d = formatDate(d3);
    if (!foundDates.has(d)) {
      candidates[`date_${candidateIndex++}`] = d;
      foundDates.add(d);
    }
  }

  // In a week / in N weeks / agle hafte
  const weekRegex = /\b(?:in\s+)?(a|an|one|\d+)\s+weeks?\b/gi;
  let wm;
  while ((wm = weekRegex.exec(text)) !== null) {
    const count = parseCount(wm[1]);
    const dObj = new Date(base);
    dObj.setDate(dObj.getDate() + count * 7);
    const d = formatDate(dObj);
    if (!foundDates.has(d)) {
      candidates[`date_${candidateIndex++}`] = d;
      foundDates.add(d);
    }
  }

  if (/\b(next\s+week|agle\s+hafte|agla\s+hafta|agle\s+week|next\s+hafte|ek\s+hafte\s+me(?:in)?)\b/i.test(text)) {
    const dObj = new Date(base);
    dObj.setDate(dObj.getDate() + 7);
    const d = formatDate(dObj);
    if (!foundDates.has(d)) {
      candidates[`date_${candidateIndex++}`] = d;
      foundDates.add(d);
    }
  }

  // Days of week: "Friday", "by Friday", "next Monday", "somvar", "shukravar"
  const allDaysPattern = Object.keys(DAYS_OF_WEEK).join("|");
  const dayRegex = new RegExp(`\\b(?:(next|this|agle)\\s+)?(${allDaysPattern})\\b`, "gi");
  let match;
  while ((match = dayRegex.exec(text)) !== null) {
    const modifier = (match[1] || "").toLowerCase();
    const dayName = match[2].toLowerCase();
    const targetIdx = DAYS_OF_WEEK[dayName];
    if (targetIdx !== undefined) {
      const resolved = getNextDayOfWeek(base, targetIdx, modifier === "next" || modifier === "agle");
      const d = formatDate(resolved);
      if (!foundDates.has(d)) {
        candidates[`date_${candidateIndex++}`] = d;
        foundDates.add(d);
      }
    }
  }

  // Explicit ISO dates: "2026-09-25"
  const isoMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (isoMatch) {
    for (const iso of isoMatch) {
      if (!foundDates.has(iso)) {
        candidates[`date_${candidateIndex++}`] = iso;
        foundDates.add(iso);
      }
    }
  }

  return candidates;
}

/**
 * Returns human-readable relative label for a YYYY-MM-DD date string.
 * Example:
 * - "Today"
 * - "Tomorrow"
 * - "In 2 days"
 * - "In a week"
 * - "In 12 days"
 * - "Yesterday" / "3d overdue"
 */
export function getRelativeDateLabel(dateStr, refDate = new Date()) {
  if (!dateStr || typeof dateStr !== "string") return "";

  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;

  const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const base = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());

  const diffMs = target.getTime() - base.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === 2) return "In 2 days";
  if (diffDays === 7) return "In a week";
  if (diffDays > 2 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays > 7 && diffDays <= 14) return `In ${diffDays} days`;
  if (diffDays === -1) return "Yesterday";
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;

  // Format month and day: e.g. "Oct 15"
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[target.getMonth()]} ${target.getDate()}`;
}

/**
 * Extracts candidate people from a note text and merges with user-provided list.
 */
export function extractCandidatePeople(note, userPeople = []) {
  const peopleSet = new Set(
    (userPeople || []).map((p) => p.trim()).filter((p) => p.length > 0)
  );

  const nameRegex = /\b[A-Z][a-z]{1,20}\b/g;
  let match;

  while ((match = nameRegex.exec(note)) !== null) {
    const word = match[0];
    const lower = word.toLowerCase();

    if (!COMMON_NON_NAMES.has(lower) && word.length >= 2) {
      peopleSet.add(word);
    }
  }

  return Array.from(peopleSet);
}

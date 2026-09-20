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
 * Split messy text into individual task lines/bullets, dropping empty ones.
 */
export function splitNotes(rawText) {
  if (!rawText || typeof rawText !== "string") return [];

  return rawText
    .split(/\r?\n/)
    .map((line) => {
      // Clean bullet points, markdown checklists, numbered lists
      return line
        .replace(/^\s*[-*•]\s*(\[[ xX]\]\s*)?/, "")
        .replace(/^\s*\d+[\.\)]\s*/, "")
        .trim();
    })
    .filter((line) => line.length > 0);
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

  // 1. "today" / "tonight" / "eod" / "this evening" / "this afternoon" / "this morning"
  if (/\b(today|tonight|this\s+(evening|afternoon|morning)|eod|end\s+of\s+day)\b/.test(text)) {
    return {
      date: formatDate(base),
      label: "Today",
      confidence: 0.95,
      phrase: "today",
    };
  }

  // 2. "day after tomorrow"
  if (/\bday\s+after\s+tomorrow\b/.test(text)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 2);
    return {
      date: formatDate(d),
      label: "In 2 days",
      confidence: 0.95,
      phrase: "day after tomorrow",
    };
  }

  // 3. "tomorrow" / "tmrw"
  if (/\b(tomorrow|tmrw)\b/.test(text)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return {
      date: formatDate(d),
      label: "Tomorrow",
      confidence: 0.95,
      phrase: "tomorrow",
    };
  }

  // 4. "in a week", "in 1 week", "in one week", "next week", "a week from now", "in a week's time"
  const inWeekMatch = text.match(/\b(?:in\s+)?(a|an|one|\d+)?\s*weeks?(?:\s+from\s+now)?\b/) || text.match(/\bnext\s+week\b/);
  if (inWeekMatch) {
    const count = inWeekMatch[1] ? parseCount(inWeekMatch[1]) : 1;
    const d = new Date(base);
    d.setDate(d.getDate() + count * 7);
    return {
      date: formatDate(d),
      label: count === 1 ? "In a week" : `In ${count} weeks`,
      confidence: 0.92,
      phrase: inWeekMatch[0],
    };
  }

  // 5. "in a day", "in 2 days", "in a few days", "in a couple days"
  const inDaysMatch = text.match(/\bin\s+(a|an|one|two|three|few|couple|\d+)\s+days?\b/);
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

  // 6. "in a month", "next month", "in N months"
  const inMonthMatch = text.match(/\b(?:in\s+)?(a|an|one|\d+)?\s*months?(?:\s+from\s+now)?\b/) || text.match(/\bnext\s+month\b/);
  if (inMonthMatch) {
    const count = inMonthMatch[1] ? parseCount(inMonthMatch[1]) : 1;
    const d = new Date(base);
    d.setMonth(d.getMonth() + count);
    return {
      date: formatDate(d),
      label: count === 1 ? "In a month" : `In ${count} months`,
      confidence: 0.88,
      phrase: inMonthMatch[0],
    };
  }

  // 7. "end of week" / "end of the week" / "eow" -> upcoming Friday
  if (/\b(end\s+of\s+(?:the\s+)?week|eow)\b/.test(text)) {
    const resolved = getNextDayOfWeek(base, DAYS_OF_WEEK.friday);
    return {
      date: formatDate(resolved),
      label: "End of week",
      confidence: 0.90,
      phrase: "end of week",
    };
  }

  // 8. Named Day of week: "Friday", "by Friday", "next Monday", "this Sunday"
  const dayRegex = /\b(?:(next|this|by|due|on)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g;
  const dayMatch = dayRegex.exec(text);
  if (dayMatch) {
    const modifier = dayMatch[1];
    const dayName = dayMatch[2];
    const targetIdx = DAYS_OF_WEEK[dayName];
    if (targetIdx !== undefined) {
      const resolved = getNextDayOfWeek(base, targetIdx, modifier === "next");
      const dayCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      return {
        date: formatDate(resolved),
        label: modifier === "next" ? `Next ${dayCap}` : dayCap,
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

  // Today
  if (/\b(today|tonight)\b/.test(text)) {
    const d = formatDate(base);
    if (!foundDates.has(d)) {
      candidates[`date_${candidateIndex++}`] = d;
      foundDates.add(d);
    }
  }

  // Tomorrow
  if (/\btomorrow\b/.test(text)) {
    const tmrw = new Date(base);
    tmrw.setDate(tmrw.getDate() + 1);
    const d = formatDate(tmrw);
    if (!foundDates.has(d)) {
      candidates[`date_${candidateIndex++}`] = d;
      foundDates.add(d);
    }
  }

  // Day after tomorrow
  if (/\bday after tomorrow\b/.test(text)) {
    const dat = new Date(base);
    dat.setDate(dat.getDate() + 2);
    const d = formatDate(dat);
    if (!foundDates.has(d)) {
      candidates[`date_${candidateIndex++}`] = d;
      foundDates.add(d);
    }
  }

  // In a week / in N weeks
  const weekRegex = /\b(?:in\s+)?(a|an|one|\d+)\s+weeks?\b/g;
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

  // Days of week: "Friday", "by Friday", "next Monday"
  const dayRegex = /\b(?:(next|this)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g;
  let match;
  while ((match = dayRegex.exec(text)) !== null) {
    const modifier = match[1];
    const dayName = match[2];
    const targetIdx = DAYS_OF_WEEK[dayName];
    if (targetIdx !== undefined) {
      const resolved = getNextDayOfWeek(base, targetIdx, modifier === "next");
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

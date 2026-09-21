// lib/expenseExtractor.js - Multilingual Expense & Splitwise Parser
// Parses English, Hindi, and Hinglish expenses into structured records

import { resolveNaturalDate, formatDate } from "./extractor.js";
import { correctCommonSpelling } from "./textUtils.js";

/**
 * Category dictionaries with keywords in English, Hindi, and Hinglish.
 */
export const CATEGORIES = [
  {
    id: "food",
    name: "Food & Dining",
    icon: "🍕",
    keywords: [
      "chai", "tea", "coffee", "samosa", "breakfast", "lunch", "dinner", "nashta",
      "khana", "snack", "snacks", "swiggy", "zomato", "restaurant", "cafe", "dhaba",
      "pizza", "burger", "biryani", "roti", "subzi", "sweets", "mithai", "drinks",
      "beer", "cocktail", "juice", "starbucks", "mcdonalds", "kfc", "dominos",
      "paratha", "maggi", "noodles", "chole", "bhature", "kulche", "lassi", "roll", "rolls"
    ],
  },
  {
    id: "transport",
    name: "Transport",
    icon: "🚗",
    keywords: [
      "cab", "taxi", "uber", "ola", "auto", "rickshaw", "metro", "bus", "train",
      "flight", "petrol", "diesel", "fuel", "gas", "cng", "parking", "toll", "fastag",
      "rapido", "ride", "bharwaya", "fare", "commute", "travel", "airport"
    ],
  },
  {
    id: "groceries",
    name: "Groceries",
    icon: "🛒",
    keywords: [
      "groceries", "grocery", "dmart", "sabzi", "vegetables", "fruits", "milk", "dudh", "doodh",
      "ration", "supermarket", "blinkit", "zepto", "instamart", "dukan", "kirana",
      "bread", "eggs", "egg", "ande", "anda", "atta", "rice", "chawal", "dal", "daal",
      "masur", "masoor", "oil", "tel", "soap", "shampoo", "saman", "saaman", "paneer",
      "dahi", "curd", "pyaz", "aloo", "tamatar", "masala", "besan", "namak", "sugar", "chini",
      "biscuit", "biscuits", "makhana", "poha", "sooji", "suji", "ghee", "butter"
    ],
  },
  {
    id: "bills",
    name: "Bills & Utilities",
    icon: "💡",
    keywords: [
      "rent", "kiraya", "electricity", "bijli", "water", "pani", "wifi", "internet",
      "broadband", "recharge", "mobile", "phone bill", "maintenance", "maid",
      "cylinder", "lpg", "gas cylinder", "insurance", "emi", "loan", "subscription"
    ],
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: "🛍️",
    keywords: [
      "shopping", "clothes", "kapde", "shoes", "movie", "cinema", "tickets", "theatre",
      "netflix", "prime", "spotify", "hotstar", "amazon", "flipkart", "myntra",
      "zara", "h&m", "game", "gaming", "electronics", "gadget", "headphones", "mall"
    ],
  },
  {
    id: "health",
    name: "Health",
    icon: "💊",
    keywords: [
      "medicine", "medicines", "dawa", "dawakhana", "pharmacy", "doctor", "hospital", "clinic",
      "checkup", "gym", "membership", "workout", "fitness", "dentist", "therapy", "apollo", "1mg", "meds"
    ],
  },
];

/**
 * Common currency markers and amount cues.
 */
const AMOUNT_PATTERNS = [
  /([\d,]+(?:\.\d{1,2})?)\s*(?:ka\s+saman|ka\s+bill|ka\s+kharcha)/i,
  /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rs\.?|rupees?|rupaye?|rupay|inr|bucks|\/-)/i,
  /(?:paid|spent|diya|bhara|bharwaya|kharcha|cost|bill(?:\s+of)?|total(?:\s+of)?)\s*(?:₹|rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:ka|ki|ke)\b/i,
  /\b([\d,]+(?:\.\d{1,2})?)\b/,
];

/**
 * Checks if a note looks like an expense.
 */
export function isExpenseNote(rawText) {
  if (!rawText || typeof rawText !== "string") return false;
  const text = rawText.toLowerCase().trim();

  // Strong currency indicators
  if (/[₹]|rs\.?|rupee|rupay|\/-|inr\b|bucks\b/.test(text)) return true;

  // Splitwise indicators
  if (/\b(split|shared\s+with|ke\s+sath\s+split|dono\s+ka|aapas\s+me)\b/.test(text)) return true;

  // Action verbs with numbers
  if (/(?:paid|spent|diya|bhara|bharwaya|kharcha|bill)\s*\d+/.test(text)) return true;

  // Amount followed by "ka" (e.g. "petrol 350 ka", "48 rupaye ka saman")
  if (/\d+\s*(?:rupaye?|rs\.?|₹)?\s*(?:ka|ki|ke)\b/.test(text)) return true;

  // Category keyword + number
  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      const reg = new RegExp(`\\b${kw}\\b.*\\b\\d+\\b|\\b\\d+\\b.*\\b${kw}\\b`, "i");
      if (reg.test(text)) return true;
    }
  }

  return false;
}

/**
 * Finds a single or primary monetary amount in a clause
 */
function findPrimarySingleAmount(text) {
  if (!text) return 0;
  for (const pat of AMOUNT_PATTERNS) {
    const match = text.match(pat);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, "");
      const val = parseFloat(cleanNum);
      if (!isNaN(val) && val > 0 && val < 10000000) {
        return val;
      }
    }
  }
  return 0;
}

/**
 * Finds all monetary amounts while rejecting quantities like "4 ande" or "2 packet"
 */
function findAllMonetaryAmounts(text) {
  const results = [];
  const nonMoneyUnits = /^(?:\s*(?:ande|anda|eggs?|kg|kilo|kilos|gm|gms|gram|grams|litre|litres|liter|liters|ltr|ltrs|packet|packets|pack|packs|darjan|dozen|dozens|piece|pieces|pc|pcs|bottle|bottles|people|log|logo|friends|ways|baje|pm|am|hours?|hrs?))\b/i;

  // Match:
  // 1: ₹20 / Rs 50
  // 2: 48 rupaye / 500rs / 100/-
  // 3: paid 50 / spent 100 / cost 20
  // 4: 20 ki daal / 28 ke ande / 350 ka petrol (Price + preposition)
  // 5: chai 15 / samosa 25 / auto 60 (Item + price)
  const tokenRegex = /(?:(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?))|(?:([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rs\.?|rupees?|rupaye?|rupay|inr|bucks|\/-))|(?:(?:paid|spent|diya|bhara|bharwaya|kharcha|cost|bill|total)\s*(?:₹|rs\.?)?\s*([\d,]+(?:\.\d{1,2})?))|(?:([\d,]+(?:\.\d{1,2})?)\s*(?:ka|ki|ke)\b)|(?:\b(?:chai|tea|coffee|samosa|nashta|khana|lunch|dinner|daal|dal|roti|sabzi|doodh|milk|bread|auto|cab|uber|ola|petrol|diesel|fare|tickets?|recharge|dawa|medicine)\s*(?:₹|rs\.?|:)?\s*([\d,]+(?:\.\d{1,2})?))/gi;

  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    const rawVal = match[1] || match[2] || match[3] || match[4] || match[5];
    if (rawVal) {
      const isExplicitMoney = Boolean(match[1] || match[2] || match[3] || match[4]);
      const afterMatch = text.slice(match.index + match[0].length);

      if (isExplicitMoney || !nonMoneyUnits.test(afterMatch)) {
        const val = parseFloat(rawVal.replace(/,/g, ""));
        if (!isNaN(val) && val > 0 && val < 10000000) {
          results.push(val);
        }
      }
    }
  }
  return results;
}

/**
 * Intelligent Multilingual Amount & Total Extractor:
 * Handles:
 * 1. Overarching envelope with breakdown:
 *    "Main aaj 48 rupaye ka saman Lekar Aaya Tha jismein se Char Ande and ₹20 ki daal" -> 48
 * 2. Explicit totals: "Total 500", "48 rupaye ka saman", "Kul milakar 350"
 * 3. Multiple item summation: "20 ki daal and 28 ke ande" -> 20 + 28 = 48
 * 4. Quantity exclusion: "Char Ande" or "4 ande" (4 is eggs count, not price)
 * 5. Date masking: "20 Sept" does not confuse money extraction
 */
export function extractAmount(rawText) {
  if (!rawText || typeof rawText !== "string") return 0;

  // Step 1: Mask out explicit date references like "20 Sept", "20th September", "20/09"
  let text = rawText
    .replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/gi, " [DATE] ")
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?\b/gi, " [DATE] ")
    .replace(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g, " [DATE] ")
    .replace(/\b\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?\b/g, " [DATE] ");

  // Step 2: Check for breakdown indicators like "jismein se", "jisme se", "out of which", "including"
  const breakdownRegex = /\b(?:jismein?\s+se|jisme\s+se|jis\s+me\s+se|out\s+of\s+which|including|consisting\s+of|comprising|breakdown\s*:?)\b/i;
  const breakdownMatch = text.match(breakdownRegex);

  if (breakdownMatch) {
    const leadPart = text.slice(0, breakdownMatch.index);
    // Check if the pre-breakdown leading clause contains an overarching total
    const leadAmount = findPrimarySingleAmount(leadPart);
    if (leadAmount > 0) {
      return leadAmount;
    }
  }

  // Step 3: Explicit total markers across the text
  // e.g. "total 500", "total of 500", "kul 500", "total spent 1200", "total bill 48"
  const explicitTotalMatch = text.match(
    /\b(?:total|kul|kul\s*milakar|overall|in\s*total)\s*(?:bill|amount|spent|kharcha|tha|of|is|=|:)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (explicitTotalMatch && explicitTotalMatch[1]) {
    const val = parseFloat(explicitTotalMatch[1].replace(/,/g, ""));
    if (!isNaN(val) && val > 0 && val < 10000000) return val;
  }

  // e.g. "48 rupaye ka saman", "500 rs ka saman", "350 ka total"
  const samanTotalMatch = text.match(
    /([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rs\.?|rupees?|rupaye?|rupay|inr)?\s*(?:ka\s+saman|ka\s+bill|ka\s+kharcha|total|in\s*total)\b/i
  );
  if (samanTotalMatch && samanTotalMatch[1]) {
    const val = parseFloat(samanTotalMatch[1].replace(/,/g, ""));
    if (!isNaN(val) && val > 0 && val < 10000000) return val;
  }

  // Step 4: Extract all itemized monetary amounts
  const itemAmounts = findAllMonetaryAmounts(text);
  if (itemAmounts.length === 1) {
    return itemAmounts[0];
  } else if (itemAmounts.length > 1) {
    // If multiple itemized amounts without an overarching total, sum them:
    // e.g. "20 ki daal and 28 ke ande" -> 20 + 28 = 48
    // e.g. "Chai 15 aur samosa 25" -> 15 + 25 = 40
    const sum = itemAmounts.reduce((a, b) => a + b, 0);
    return Math.round(sum * 100) / 100;
  }

  // Step 5: Fallback to primary single amount match
  return findPrimarySingleAmount(text);
}

/**
 * Detects Splitwise shared expense details:
 * - "split with Rahul" -> 2 people, Rahul owes you 50%
 * - "Rahul paid 1200 split with me" -> Rahul paid, you owe Rahul 50%
 * - "split between 3" -> 3 people
 * - "Aman and Priya split 900"
 */
export function extractSplitwise(rawText, totalAmount = 0) {
  if (!rawText || typeof rawText !== "string") {
    return {
      isSplit: false,
      participants: [],
      payer: "you",
      splitCount: 1,
      yourShare: totalAmount,
      theirShare: 0,
      owedTo: "",
      owedAmount: 0,
      settled: false,
    };
  }

  const text = rawText.toLowerCase().trim();

  // Check if this note mentions splitting or sharing
  const hasSplitWord =
    /\b(split|shared|hissa|aadha|aadhe|aapas|dono|teeno|divide|devide|bata|batega|banta|bantna|baantna)\b/i.test(text) ||
    /\b(?:teen|do|char|panch|\d+)\s+(?:logo|log|people|friends|ways?)\b/i.test(text);

  // Check for person names mentioned in split context
  // e.g. "split with Rahul", "Aman paid 900 split with me", "Rahul ke sath split"
  let friendName = "";
  const payerLead = rawText.match(/\b([A-Z][a-z]+)\s+(?:ne\s+(?:pay|diya|bhara)|paid|bhara|diya)\b/i);

  if (payerLead && payerLead[1] && !["you", "i", "me", "we", "maine", "mene", "humne"].includes(payerLead[1].toLowerCase())) {
    friendName = payerLead[1].trim();
  } else {
    const withMatch =
      rawText.match(/\b(?:split\s+(?:with|between)|shared\s+with)\s+([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?)\b/i) ||
      rawText.match(/\b([A-Z][a-z]+)\s+ke\s+sath\s+split\b/i);

    if (withMatch && withMatch[1] && !["me", "you", "us", "him", "her", "them", "everyone", "teen", "char", "panch", "dono"].includes(withMatch[1].toLowerCase())) {
      friendName = withMatch[1].trim();
    }
  }

  // Hindi numbers dictionary for split count
  const hindiNumbers = {
    do: 2,
    dono: 2,
    teen: 3,
    teeno: 3,
    char: 4,
    charo: 4,
    panch: 5,
    pancho: 5,
    chhe: 6,
  };

  // Check split count (e.g. "between 3", "split 4 ways", "3 people", "teen logo", "do logo me devide")
  let splitCount = 2; // default shared expense is 2 people
  const countMatch =
    text.match(/\b(?:between|among|\/|ways?)\s*(\d+)\b/i) ||
    text.match(/\b(\d+)\s*(?:people|log|logo|friends)\b/i) ||
    text.match(/\b(do|dono|teen|teeno|char|charo|panch|pancho|chhe)\s*(?:people|log|logo|friends|ways?)\b/i) ||
    text.match(/\b(teen|char|panch|chhe)\s+(?:me|mein)\s*(?:divide|devide|split)?\b/i);

  if (countMatch && countMatch[1]) {
    const rawCount = countMatch[1].toLowerCase();
    if (hindiNumbers[rawCount]) {
      splitCount = hindiNumbers[rawCount];
    } else {
      const parsed = parseInt(rawCount, 10);
      if (!isNaN(parsed) && parsed >= 2 && parsed <= 20) {
        splitCount = parsed;
      }
    }
  }

  // Check if multiple names joined by 'and' or '&'
  if (friendName && (friendName.includes(" and ") || friendName.includes(" & "))) {
    const parts = friendName.split(/\s+(?:and|&)\s+/i);
    splitCount = parts.length + 1; // friends + you
  }

  if (!hasSplitWord && !friendName) {
    return {
      isSplit: false,
      participants: ["You"],
      payer: "You",
      splitCount: 1,
      yourShare: totalAmount,
      theirShare: 0,
      owedTo: "",
      owedAmount: 0,
      settled: false,
    };
  }

  // Determine who paid
  // e.g. "Rahul paid 1200", "Aman ne diya 500"
  let payer = "You";
  if (payerLead && payerLead[1] && !["you", "i", "we", "maine", "mene", "humne"].includes(payerLead[1].toLowerCase())) {
    payer = friendName;
  } else if (friendName) {
    const payerMatch = new RegExp(`\\b${friendName}\\b.*\\b(?:paid|diya|bhara|gave)\\b|\\b(?:paid|diya|bhara)\\s+by\\s+${friendName}\\b`, "i");
    if (payerMatch.test(text)) {
      payer = friendName;
    }
  }

  const yourShare = totalAmount > 0 ? Math.round((totalAmount / splitCount) * 100) / 100 : 0;
  const theirShare = totalAmount > 0 ? Math.round((totalAmount - yourShare) * 100) / 100 : 0;

  const partnerLabel = friendName || (splitCount > 2 ? `${splitCount - 1} friends` : "Friend");

  let owedTo = "";
  let owedAmount = 0;

  if (payer.toLowerCase() === "you") {
    // You paid, friend owes you their share
    owedTo = "You";
    owedAmount = theirShare;
  } else {
    // Friend paid, you owe them your share
    owedTo = payer;
    owedAmount = yourShare;
  }

  return {
    isSplit: true,
    partnerName: partnerLabel,
    participants: ["You", partnerLabel],
    payer: payer.toLowerCase() === "you" ? "You" : friendName,
    splitCount,
    yourShare,
    theirShare,
    owedTo: owedTo === "you" ? "You" : owedTo,
    owedAmount,
    settled: false,
  };
}

/**
 * Determines category from text keywords.
 */
export function extractCategory(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { id: "general", name: "General & Misc", icon: "💳" };
  }

  const text = rawText.toLowerCase();

  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      const reg = new RegExp(`\\b${kw}\\b`, "i");
      if (reg.test(text)) {
        return {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
        };
      }
    }
  }

  return { id: "general", name: "General & Misc", icon: "💳" };
}

/**
 * Preserves the expense note text intact without cutting out words or extra text.
 */
export function extractDescription(rawText, category) {
  if (!rawText || typeof rawText !== "string") return category?.name || "Expense";

  // Clean leading bullets, dashes, numbers, and extra spaces only
  const clean = rawText
    .replace(/^[-*•\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) {
    return category?.name || "Expense";
  }

  // Capitalize first character
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Extracts merchant/vendor/location cues like "at DMart", "at Uber", "at gym"
 */
export function extractMerchant(text) {
  if (!text || typeof text !== "string") return null;
  const match = text.match(/\b(?:at|from|@)\s+([A-Za-z0-9&'\-\s]+?)(?:\s+(?:yesterday|today|tomorrow|split|with|for|\d+|$)|$)/i);
  if (match && match[1]) {
    const raw = match[1].trim();
    if (raw.length >= 2 && raw.length <= 30 && !/^\d+$/.test(raw)) {
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
  }
  return null;
}

/**
 * Master parser: Takes any raw note (English, Hindi, Hinglish) and extracts:
 */
export function parseExpense(rawText, refDate = new Date()) {
  const corrected = correctCommonSpelling(rawText || "");
  const amount = extractAmount(corrected);
  const category = extractCategory(corrected);
  const title = extractDescription(corrected, category, amount);
  const merchant = extractMerchant(corrected);
  const split = extractSplitwise(corrected, amount);

  // Extract date (today if not explicitly stated)
  const resolvedDate = resolveNaturalDate(corrected, refDate);
  const date = resolvedDate?.date || formatDate(refDate);

  return {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    merchant,
    amount,
    currency: "INR",
    symbol: "₹",
    category: category.id,
    categoryName: category.name,
    categoryIcon: category.icon,
    date,
    dateLabel: resolvedDate?.label || "Today",
    split,
    rawNote: rawText,
    createdAt: new Date().toISOString(),
  };
}

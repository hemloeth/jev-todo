// lib/sorter.js - Evaluates messy notes using TypeSafe Jev model "jev-latest"

import {
  MODEL_NAME,
  IS_TASK_MIN,
  DEADLINE_CONFIDENCE_MIN,
  BLOCKED_MIN,
  BLOCKED_MAYBE,
  QUESTIONS,
} from "./config.js";
import {
  splitNotes,
  formatDate,
  extractCandidateDates,
  extractCandidatePeople,
  resolveNaturalDate,
} from "./extractor.js";
import { normalizeTaskText } from "./textUtils.js";

/**
 * Executes a call to the TypeSafe System One API with retries for 429 and 5xx.
 */
async function callTypeSafeSystemOne({ state, questions, apiKey }) {
  // If @typesafe-ai/sdk is installed, use it
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TypeSafeClient } = require("@typesafe-ai/sdk");
    if (TypeSafeClient) {
      const client = new TypeSafeClient({
        apiKey: apiKey,
      });
      return await client.systemOne({
        model: MODEL_NAME,
        state,
        questions,
      });
    }
  } catch {
    // SDK not installed in node_modules; use direct fetch with standard retries
  }

  const endpoint = "https://api.typesafe.ai/v1/systemone";
  const maxRetries = 3;
  let attempt = 0;
  let delay = 500;

  while (attempt <= maxRetries) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          state,
          questions,
        }),
      });

      if (res.ok) {
        return await res.json();
      }

      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        attempt++;
        const retryAfter = res.headers.get("retry-after");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
        console.warn(
          `[TypeSafe HTTP ${res.status}] Retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})...`
        );
        await new Promise((r) => setTimeout(r, waitMs));
        delay *= 2;
        continue;
      }

      const errorText = await res.text();
      throw new Error(`TypeSafe API error ${res.status}: ${errorText}`);
    } catch (err) {
      if (attempt < maxRetries && err.message?.includes("fetch")) {
        attempt++;
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

/**
 * Sorts messy notes into structured tasks using TypeSafe Jev.
 */
export async function sortNotes(rawNotes, userPeople = [], customApiKey = null) {
  const apiKey = customApiKey || process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TYPESAFE_API_KEY is not set. Please set TYPESAFE_API_KEY in your environment or .env.local file."
    );
  }

  const lines = splitNotes(rawNotes);
  if (lines.length === 0) {
    return {
      tasks: [],
      nonTasks: [],
      failedNotes: [],
      modelVersion: MODEL_NAME,
    };
  }

  const todayStr = formatDate(new Date());
  const tasks = [];
  const nonTasks = [];
  const failedNotes = [];
  let reportedModelVersion = MODEL_NAME;

  for (let i = 0; i < lines.length; i++) {
    const originalNote = lines[i];
    // Lightly trim whitespace and bullet artifacts, then normalize spelling and capitalization
    const rawTrimmed = originalNote.replace(/^[-*•\s]+/, "").trim();
    const trimmedText = normalizeTaskText(rawTrimmed);

    try {
      // Step 2: Extract candidate dates and candidate people
      const dateCandidates = extractCandidateDates(trimmedText, new Date());
      const candidatePeople = extractCandidatePeople(trimmedText, userPeople);

      // Step 3: Build State (guaranteed never null)
      const state = {
        note: trimmedText,
        today: todayStr,
        people: candidatePeople,
        date_candidates: dateCandidates,
      };

      // Build questions map dynamically for this note (Personal workflow: is_task, priority, deadline)
      const questions = {
        is_task: {
          type: "noul",
          instructions: QUESTIONS.is_task.instructions,
        },
        priority: {
          type: "score",
          instructions: QUESTIONS.priority.instructions,
          criteria: QUESTIONS.priority.criteria,
        },
      };

      // Dynamically add deadline question only if date_candidates exists
      const dateKeys = Object.keys(dateCandidates);
      if (dateKeys.length > 0) {
        const dateCriteria = {};
        for (const k of dateKeys) {
          dateCriteria[k] = dateCandidates[k];
        }
        dateCriteria["none"] = "No deadline stated";

        questions.deadline = {
          type: "choice",
          instructions: QUESTIONS.deadline.instructions,
          criteria: dateCriteria,
        };
      }

      // Send ONE request to Jev with all questions
      const response = await callTypeSafeSystemOne({
        state,
        questions,
        apiKey,
      });

      // Log model version that answered
      if (response?.model) {
        reportedModelVersion = response.model;
        console.log(
          `[TypeSafe Jev] Model: ${response.model} evaluated note [${i + 1}/${lines.length}]: "${trimmedText.slice(0, 35)}..."`
        );
      }

      const answers = response?.answers || {};

      // Parse answers
      const isTaskAnswer = answers.is_task;
      const isTaskProb =
        typeof isTaskAnswer?.noul === "number" ? isTaskAnswer.noul : 1.0;

      const priorityAnswer = answers.priority;
      const priorityScore =
        typeof priorityAnswer?.score === "number" ? priorityAnswer.score : 1.0;
      const priorityConfidence =
        typeof priorityAnswer?.confidence === "number"
          ? priorityAnswer.confidence
          : 0.8;

      // Priority Label based on rubric
      let priorityLabel = "Medium";
      const roundedScore = Math.round(priorityScore);
      if (roundedScore <= 0) priorityLabel = "Someday";
      else if (roundedScore === 1) priorityLabel = "Weeks";
      else if (roundedScore === 2) priorityLabel = "Days";
      else priorityLabel = "Urgent";

      // Deadline answer evaluation
      let deadlineValue = "";
      let deadlineFlag = "none";
      let deadlineConfidence = 0;

      if (questions.deadline && answers.deadline) {
        const choice = answers.deadline.choice;
        deadlineConfidence = answers.deadline.confidence ?? 0;

        if (choice && choice !== "none" && dateCandidates[choice]) {
          if (deadlineConfidence >= DEADLINE_CONFIDENCE_MIN) {
            deadlineValue = dateCandidates[choice];
            deadlineFlag = "confident";
          } else {
            // Per spec: below DEADLINE_CONFIDENCE_MIN, leave deadline blank, mark "maybe"
            deadlineValue = "";
            deadlineFlag = "maybe";
          }
        }
      }

      // Explicit Natural Language Date Resolution (Guarantees "today", "tomorrow", "in a week" are resolved)
      if (!deadlineValue) {
        const natural = resolveNaturalDate(trimmedText, new Date());
        if (natural && natural.date) {
          deadlineValue = natural.date;
          deadlineFlag = "confident";
          deadlineConfidence = natural.confidence;
        }
      }

      // Personal solo workflow: clear to execute
      const waitingOnValue = "";
      const waitingOnFlag = "none";
      const blockedNoul = 0.0;

      const item = {
        id: `task_${Date.now()}_${i}`,
        text: trimmedText,
        is_task: isTaskProb >= IS_TASK_MIN,
        is_task_confidence: isTaskProb,
        priority_score: priorityScore,
        priority_label: priorityLabel,
        priority_confidence: priorityConfidence,
        priority_flag: "confident",
        deadline: deadlineValue,
        deadline_flag: deadlineFlag,
        deadline_confidence: deadlineConfidence,
        waiting_on: waitingOnValue,
        waiting_on_flag: waitingOnFlag,
        blocked_noul: blockedNoul,
        // Track whether user has manually edited a field in the UI
        user_edited: {
          text: false,
          priority: false,
          deadline: false,
          waiting_on: false,
        },
        status: "sorted",
      };

      if (isTaskProb < IS_TASK_MIN) {
        nonTasks.push(item);
      } else {
        tasks.push(item);
      }
    } catch (err) {
      console.error(`[TypeSafe Jev Error] Note "${trimmedText}":`, err.message);
      // Per spec: If a call fails, show the note unsorted instead of dropping it
      failedNotes.push({
        id: `failed_${Date.now()}_${i}`,
        text: trimmedText,
        is_task: true,
        priority_score: -1,
        priority_label: "Unsorted",
        priority_flag: "none",
        deadline: "",
        deadline_flag: "none",
        waiting_on: "",
        waiting_on_flag: "none",
        status: "failed",
        error: err.message,
      });
    }
  }

  // Sort tasks by priority score descending (urgent first)
  tasks.sort((a, b) => b.priority_score - a.priority_score);

  return {
    tasks,
    nonTasks,
    failedNotes,
    modelVersion: reportedModelVersion,
    totalLines: lines.length,
  };
}

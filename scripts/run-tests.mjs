// scripts/run-tests.mjs - Runs 10 sample test notes against TypeSafe Jev and prints answers + confidence scores

import { sortNotes } from "../lib/sorter.js";
import {
  IS_TASK_MIN,
  DEADLINE_CONFIDENCE_MIN,
  BLOCKED_MIN,
  BLOCKED_MAYBE,
} from "../lib/config.js";

const SAMPLE_NOTES = [
  // Required 5 notes
  "Waiting on Sam for budget numbers, then send deck by Friday",
  "Call dentist",
  "Maybe learn guitar someday",
  "Pay rent tomorrow",
  "Priya to send contract, follow up Monday",

  // 5 additional realistic notes
  "Review pull request #402 for Sarah before EOD",
  "Remember that photosynthesis happens in chloroplasts", // Idea / fact, not a task
  "Need Alex to approve invoice #982 before paying vendor next Wednesday",
  "Clean desk and organize bookshelf",
  "Catch flight on Sunday morning"
];

const PEOPLE_LIST = ["Sam", "Priya", "Sarah", "Alex"];

async function run() {
  console.log("================================================================================");
  console.log("           TYPE SAFE JEV SMART TO-DO SORTER - TEST RUNNER                       ");
  console.log("================================================================================\n");

  console.log("Configured Thresholds:");
  console.log(`- IS_TASK_MIN:             ${IS_TASK_MIN}`);
  console.log(`- DEADLINE_CONFIDENCE_MIN: ${DEADLINE_CONFIDENCE_MIN}`);
  console.log(`- BLOCKED_MIN:             ${BLOCKED_MIN}`);
  console.log(`- BLOCKED_MAYBE:           ${BLOCKED_MAYBE}`);
  console.log(`- Known People:            ${PEOPLE_LIST.join(", ")}\n`);

  const rawNotes = SAMPLE_NOTES.join("\n");

  try {
    const result = await sortNotes(rawNotes, PEOPLE_LIST);

    console.log(`\nModel Version Reported: ${result.modelVersion}`);
    console.log(`Sorted Tasks: ${result.tasks.length} | Non-Tasks: ${result.nonTasks.length} | Failed: ${result.failedNotes.length}\n`);

    console.log("--------------------------------------------------------------------------------");
    console.log("ACTIONABLE TASKS (SORTED BY PRIORITY DESCENDING)");
    console.log("--------------------------------------------------------------------------------");

    result.tasks.forEach((task, idx) => {
      console.log(`\n[${idx + 1}] "${task.text}"`);
      console.log(`    Priority:   ${task.priority_label} (Score: ${task.priority_score.toFixed(2)}, Conf: ${task.priority_confidence.toFixed(2)}) [${task.priority_flag}]`);
      console.log(`    Deadline:   ${task.deadline || "(none)"} (Conf: ${task.deadline_confidence.toFixed(2)}) [${task.deadline_flag}]`);
      console.log(`    Waiting On: ${task.waiting_on || "(none)"} (Blocked Noul: ${task.blocked_noul.toFixed(2)}) [${task.waiting_on_flag}]`);
      console.log(`    Task Conf:  ${task.is_task_confidence.toFixed(2)} (is_task: ${task.is_task})`);
    });

    if (result.nonTasks.length > 0) {
      console.log("\n--------------------------------------------------------------------------------");
      console.log("NON-TASKS (BELOW IS_TASK_MIN THRESHOLD)");
      console.log("--------------------------------------------------------------------------------");

      result.nonTasks.forEach((item, idx) => {
        console.log(`\n[${idx + 1}] "${item.text}"`);
        console.log(`    Task Probability: ${item.is_task_confidence.toFixed(2)} (< ${IS_TASK_MIN})`);
        console.log(`    Priority Score:   ${item.priority_score.toFixed(2)}`);
      });
    }

    if (result.failedNotes.length > 0) {
      console.log("\n--------------------------------------------------------------------------------");
      console.log("FAILED / UNSORTED NOTES");
      console.log("--------------------------------------------------------------------------------");

      result.failedNotes.forEach((item, idx) => {
        console.log(`\n[${idx + 1}] "${item.text}"`);
        console.log(`    Error: ${item.error}`);
      });
    }

    console.log("\n================================================================================");
    console.log("TEST RUN COMPLETE");
    console.log("================================================================================");
  } catch (err) {
    console.error("\nTest run error:", err.message);
    if (!process.env.TYPESAFE_API_KEY) {
      console.error("\nNOTE: Please set TYPESAFE_API_KEY in your environment or .env.local to run tests with live Jev.");
    }
  }
}

run();

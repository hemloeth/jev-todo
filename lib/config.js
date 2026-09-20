// config.js - All TypeSafe questions and thresholds for Smart To-Do Sorter

export const MODEL_NAME = "jev-latest";

// THRESHOLDS (named constants)
export const IS_TASK_MIN = 0.5; // below this, show note as "not a task"
export const DEADLINE_CONFIDENCE_MIN = 0.7; // below this, leave deadline blank, mark "maybe"
export const BLOCKED_MIN = 0.6; // at or above this, writer is definitely blocked
export const BLOCKED_MAYBE = 0.4; // between 0.4 and 0.6, show waiting_on as "maybe"

// QUESTIONS CONFIGURATION
export const QUESTIONS = {
  is_task: {
    type: "noul",
    instructions: "Is note an action the writer must do, rather than an idea or fact?",
  },
  priority: {
    type: "score",
    instructions: "How urgent is note given today?",
    criteria: [
      "Someday, no time pressure",
      "Within a few weeks",
      "Within the next few days",
      "Today or overdue",
    ],
  },
  deadline: {
    type: "choice",
    instructions: "Which date is the deadline for note?",
    // options built dynamically: one per date_candidates entry + "none": "No deadline stated"
  },
  blocked: {
    type: "noul",
    instructions: "Is the writer waiting on someone else before they can proceed?",
  },
  waiting_on: {
    type: "choice",
    instructions: "Who is the writer waiting on?",
    // options built dynamically: one per person in people + "nobody": "Not waiting on anyone"
  },
};

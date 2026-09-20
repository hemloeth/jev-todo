# config.py - All TypeSafe questions and thresholds for Smart To-Do Sorter

MODEL_NAME = "jev-latest"

# THRESHOLDS
IS_TASK_MIN = 0.5
DEADLINE_CONFIDENCE_MIN = 0.7
BLOCKED_MIN = 0.6
BLOCKED_MAYBE = 0.4

# QUESTIONS
QUESTIONS = {
    "is_task": {
        "type": "noul",
        "instructions": "Is note an action the writer must do, rather than an idea or fact?",
    },
    "priority": {
        "type": "score",
        "instructions": "How urgent is note given today?",
        "criteria": [
            "Someday, no time pressure",
            "Within a few weeks",
            "Within the next few days",
            "Today or overdue",
        ],
    },
    "deadline": {
        "type": "choice",
        "instructions": "Which date is the deadline for note?",
        # options built dynamically: one per date_candidates entry, plus "none": "No deadline stated"
    },
    "blocked": {
        "type": "noul",
        "instructions": "Is the writer waiting on someone else before they can proceed?",
    },
    "waiting_on": {
        "type": "choice",
        "instructions": "Who is the writer waiting on?",
        # options built dynamically: one per person in people, plus "nobody": "Not waiting on anyone"
    },
}

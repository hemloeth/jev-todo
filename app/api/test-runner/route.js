// app/api/test-runner/route.js - Runs the 10 test notes and returns structured results with confidence

import { NextResponse } from "next/server";
import { sortNotes } from "@/lib/sorter";
import {
  IS_TASK_MIN,
  DEADLINE_CONFIDENCE_MIN,
  BLOCKED_MIN,
  BLOCKED_MAYBE,
} from "@/lib/config";

const TEST_NOTES = [
  "Waiting on Sam for budget numbers, then send deck by Friday",
  "Call dentist",
  "Maybe learn guitar someday",
  "Pay rent tomorrow",
  "Priya to send contract, follow up Monday",
  "Review pull request #402 for Sarah before EOD",
  "Remember that photosynthesis happens in chloroplasts",
  "Need Alex to approve invoice #982 before paying vendor next Wednesday",
  "Clean desk and organize bookshelf",
  "Catch flight on Sunday morning",
];

const DEFAULT_PEOPLE = ["Sam", "Priya", "Sarah", "Alex"];

export async function GET(request) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get("apiKey") || process.env.TYPESAFE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "TYPESAFE_API_KEY is not set. Please set it in .env.local or provide it.",
          missingApiKey: true,
        },
        { status: 401 }
      );
    }

    const rawNotes = TEST_NOTES.join("\n");
    const result = await sortNotes(rawNotes, DEFAULT_PEOPLE, apiKey);

    // Format unified results array for the test runner table
    const results = [
      ...(result.tasks || []).map((t) => ({
        note: t.text,
        is_task: true,
        priority_label: t.priority_label,
        priority_score: t.priority_score,
        deadline: t.deadline,
        waiting_on: t.waiting_on,
        status: t.status,
      })),
      ...(result.nonTasks || []).map((nt) => ({
        note: nt.text,
        is_task: false,
        priority_label: "—",
        priority_score: nt.priority_score || 0,
        deadline: "",
        waiting_on: "",
        status: "idea",
      })),
      ...(result.failedNotes || []).map((f) => ({
        note: f.text,
        is_task: true,
        priority_label: "Failed",
        priority_score: -1,
        deadline: "",
        waiting_on: "",
        status: "failed",
      })),
    ];

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - startTime,
      results,
      thresholds: {
        IS_TASK_MIN,
        DEADLINE_CONFIDENCE_MIN,
        BLOCKED_MIN,
        BLOCKED_MAYBE,
      },
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Test run failed" },
      { status: 500 }
    );
  }
}

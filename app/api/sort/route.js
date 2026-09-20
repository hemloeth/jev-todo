// app/api/sort/route.js - Server-side endpoint for Smart To-Do Sorter

import { NextResponse } from "next/server";
import { sortNotes } from "@/lib/sorter";

export async function POST(request) {
  try {
    const body = await request.json();
    const { notes, people = [], apiKey = null } = body;

    if (!notes || typeof notes !== "string" || !notes.trim()) {
      return NextResponse.json(
        { error: "Please provide notes to sort." },
        { status: 400 }
      );
    }

    const effectiveKey = apiKey || process.env.TYPESAFE_API_KEY;
    if (!effectiveKey) {
      return NextResponse.json(
        {
          error:
            "TYPESAFE_API_KEY is missing. Please set it in your .env.local file or provide it in the API settings.",
          missingApiKey: true,
        },
        { status: 401 }
      );
    }

    const result = await sortNotes(notes, people, effectiveKey);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /api/sort Error]", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while sorting notes." },
      { status: 500 }
    );
  }
}

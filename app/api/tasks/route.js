import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const db = await getDb();
      const doc = await db.collection("user_data").findOne({ userId: user._id.toString() });

      if (!doc) {
        return NextResponse.json({
          success: true,
          tasks: [],
          nonTasks: [],
        });
      }

      return NextResponse.json({
        success: true,
        tasks: doc.tasks || [],
        nonTasks: doc.nonTasks || [],
        updatedAt: doc.updatedAt,
      });
    } catch (dbErr) {
      console.warn("MongoDB GET tasks offline fallback:", dbErr.message);
      return NextResponse.json({
        success: true,
        offline: true,
        tasks: [],
        nonTasks: [],
      });
    }
  } catch (error) {
    console.error("Tasks GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userId = user._id.toString();

    try {
      const db = await getDb();

      // If syncing the entire state (tasks + nonTasks)
      if (body.action === "sync" || (Array.isArray(body.tasks) && Array.isArray(body.nonTasks))) {
        await db.collection("user_data").updateOne(
          { userId },
          {
            $set: {
              userId,
              email: user.email,
              tasks: body.tasks || [],
              nonTasks: body.nonTasks || [],
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        return NextResponse.json({
          success: true,
          message: "Synchronized with MongoDB",
          count: (body.tasks || []).length,
        });
      }

      // Adding individual task
      if (body.action === "add" && body.task) {
        await db.collection("user_data").updateOne(
          { userId },
          {
            $push: { tasks: body.task },
            $set: { updatedAt: new Date() },
          },
          { upsert: true }
        );
        return NextResponse.json({ success: true, task: body.task });
      }

      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    } catch (dbErr) {
      console.warn("MongoDB POST tasks offline fallback:", dbErr.message);
      return NextResponse.json({
        success: true,
        offline: true,
        message: "Saved locally (MongoDB offline)",
      });
    }
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to save tasks" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, updates } = await req.json();
    if (!id || !updates) {
      return NextResponse.json({ error: "Task ID and updates required" }, { status: 400 });
    }

    const userId = user._id.toString();

    try {
      const db = await getDb();
      const doc = await db.collection("user_data").findOne({ userId });
      if (!doc || !doc.tasks) {
        return NextResponse.json({ success: true, offline: true });
      }

      const updatedTasks = doc.tasks.map((task) => {
        if (task.id === id) {
          return { ...task, ...updates };
        }
        return task;
      });

      await db.collection("user_data").updateOne(
        { userId },
        {
          $set: {
            tasks: updatedTasks,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({ success: true, tasks: updatedTasks });
    } catch (dbErr) {
      console.warn("MongoDB PUT tasks offline fallback:", dbErr.message);
      return NextResponse.json({ success: true, offline: true });
    }
  } catch (error) {
    console.error("Tasks PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    const userId = user._id.toString();

    try {
      const db = await getDb();
      await db.collection("user_data").updateOne(
        { userId },
        {
          $pull: { tasks: { id } },
          $set: { updatedAt: new Date() },
        }
      );

      return NextResponse.json({ success: true, deletedId: id });
    } catch (dbErr) {
      console.warn("MongoDB DELETE tasks offline fallback:", dbErr.message);
      return NextResponse.json({ success: true, offline: true, deletedId: id });
    }
  } catch (error) {
    console.error("Tasks DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete task" }, { status: 500 });
  }
}

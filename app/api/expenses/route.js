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
          expenses: [],
        });
      }

      return NextResponse.json({
        success: true,
        expenses: doc.expenses || [],
        updatedAt: doc.updatedAt,
      });
    } catch (dbErr) {
      console.warn("MongoDB GET expenses offline fallback:", dbErr.message);
      return NextResponse.json({
        success: true,
        offline: true,
        expenses: [],
      });
    }
  } catch (error) {
    console.error("Expenses GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch expenses" }, { status: 500 });
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

      // Sync entire expenses array
      if (body.action === "sync" || Array.isArray(body.expenses)) {
        await db.collection("user_data").updateOne(
          { userId },
          {
            $set: {
              userId,
              email: user.email,
              expenses: body.expenses || [],
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        return NextResponse.json({
          success: true,
          message: "Expenses synchronized with MongoDB",
          count: (body.expenses || []).length,
        });
      }

      // Add individual expense
      if (body.action === "add" && body.expense) {
        await db.collection("user_data").updateOne(
          { userId },
          {
            $push: { expenses: body.expense },
            $set: { updatedAt: new Date() },
          },
          { upsert: true }
        );
        return NextResponse.json({ success: true, expense: body.expense });
      }

      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    } catch (dbErr) {
      console.warn("MongoDB POST expenses offline fallback:", dbErr.message);
      return NextResponse.json({
        success: true,
        offline: true,
        message: "Saved locally (MongoDB offline)",
      });
    }
  } catch (error) {
    console.error("Expenses POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to save expenses" }, { status: 500 });
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
      return NextResponse.json({ error: "Expense ID and updates required" }, { status: 400 });
    }

    const userId = user._id.toString();

    try {
      const db = await getDb();
      const doc = await db.collection("user_data").findOne({ userId });
      if (!doc || !doc.expenses) {
        return NextResponse.json({ success: true, offline: true });
      }

      const updatedExpenses = doc.expenses.map((expense) => {
        if (expense.id === id) {
          return { ...expense, ...updates };
        }
        return expense;
      });

      await db.collection("user_data").updateOne(
        { userId },
        {
          $set: {
            expenses: updatedExpenses,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({ success: true, expenses: updatedExpenses });
    } catch (dbErr) {
      console.warn("MongoDB PUT expenses offline fallback:", dbErr.message);
      return NextResponse.json({ success: true, offline: true });
    }
  } catch (error) {
    console.error("Expenses PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to update expense" }, { status: 500 });
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
      return NextResponse.json({ error: "Expense ID required" }, { status: 400 });
    }

    const userId = user._id.toString();

    try {
      const db = await getDb();
      await db.collection("user_data").updateOne(
        { userId },
        {
          $pull: { expenses: { id } },
          $set: { updatedAt: new Date() },
        }
      );

      return NextResponse.json({ success: true, deletedId: id });
    } catch (dbErr) {
      console.warn("MongoDB DELETE expenses offline fallback:", dbErr.message);
      return NextResponse.json({ success: true, offline: true, deletedId: id });
    }
  } catch (error) {
    console.error("Expenses DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete expense" }, { status: 500 });
  }
}

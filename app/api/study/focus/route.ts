import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import FocusSession from "@/models/FocusSession";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function labelDay(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function labelMonth(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short" });
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const sessions = await FocusSession.find({
      userId: session.user.id,
      mode: "focus",
      completedAt: { $gte: yearAgo },
    })
      .select("minutes completedAt")
      .lean();

    // Week: last 7 days
    const week: { label: string; value: number; key: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = startOfDay(new Date(now));
      day.setDate(day.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      week.push({ label: labelDay(day), value: 0, key });
    }

    // Month: last 4 calendar weeks
    const month: { label: string; value: number; key: string }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfDay(new Date(now));
      weekStart.setDate(weekStart.getDate() - i * 7 - ((weekStart.getDay() + 6) % 7));
      const key = weekStart.toISOString().slice(0, 10);
      month.push({ label: `Wk ${4 - i}`, value: 0, key });
    }

    // Year: last 12 months
    const year: { label: string; value: number; key: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      year.push({ label: labelMonth(m), value: 0, key });
    }

    let totalFocusMinutes = 0;
    let sessionsCompleted = 0;

    for (const s of sessions) {
      const mins = Number(s.minutes) || 0;
      totalFocusMinutes += mins;
      sessionsCompleted += 1;
      const completed = new Date(s.completedAt);

      const dayKey = startOfDay(completed).toISOString().slice(0, 10);
      const weekBucket = week.find((b) => b.key === dayKey);
      if (weekBucket) weekBucket.value += mins / 60;

      const weekStart = startOfDay(new Date(completed));
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      const monthKey = weekStart.toISOString().slice(0, 10);
      // Match nearest month bucket by finding containing week
      const monthBucket = month.find((b) => {
        const start = new Date(b.key);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return completed >= start && completed < end;
      });
      if (monthBucket) monthBucket.value += mins / 60;
      else {
        // fallback: nearest labeled key
        const exact = month.find((b) => b.key === monthKey);
        if (exact) exact.value += mins / 60;
      }

      const yKey = `${completed.getFullYear()}-${String(completed.getMonth() + 1).padStart(2, "0")}`;
      const yearBucket = year.find((b) => b.key === yKey);
      if (yearBucket) yearBucket.value += mins / 60;
    }

    const round = (n: number) => Math.round(n * 10) / 10;

    return NextResponse.json({
      week: week.map(({ label, value }) => ({ label, value: round(value) })),
      month: month.map(({ label, value }) => ({ label, value: round(value) })),
      year: year.map(({ label, value }) => ({ label, value: round(value) })),
      totalFocusMinutes,
      sessionsCompleted,
    });
  } catch (error) {
    console.error("Focus metrics GET error:", error);
    return NextResponse.json({ message: "Failed to load focus metrics" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const minutes = Number(body.minutes);
    const mode = body.mode === "shortBreak" || body.mode === "longBreak" ? body.mode : "focus";

    if (!Number.isFinite(minutes) || minutes < 0.25) {
      return NextResponse.json({ message: "Invalid session duration" }, { status: 400 });
    }

    await dbConnect();

    const saved = await FocusSession.create({
      userId: session.user.id,
      minutes: Math.round(minutes * 100) / 100,
      mode,
      completedAt: new Date(),
    });

    return NextResponse.json({
      _id: saved._id,
      minutes: saved.minutes,
      mode: saved.mode,
      completedAt: saved.completedAt,
    });
  } catch (error) {
    console.error("Focus metrics POST error:", error);
    return NextResponse.json({ message: "Failed to log focus session" }, { status: 500 });
  }
}

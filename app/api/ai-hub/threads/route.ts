import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";

export const dynamic = "force-dynamic";
const MAX_THREAD_TITLE_CHARS = 80;

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const threads = await ChatHistory.find({ userId: session.user.id })
      .select("threadTitle threadType createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(threads);
  } catch (error: unknown) {
    console.error("Threads GET API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const rawTitle =
      typeof body?.title === "string" ? body.title.trim() : "New Chat";
    const title = (rawTitle || "New Chat").slice(0, MAX_THREAD_TITLE_CHARS);
    const type = body?.type === "document" ? "document" : "general";

    await dbConnect();
    const newThread = new ChatHistory({
      userId: session.user.id,
      threadTitle: title,
      threadType: type,
      messages: [],
    });

    await newThread.save();

    return NextResponse.json(newThread);
  } catch (error: unknown) {
    console.error("Threads POST API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";

export const dynamic = "force-dynamic";

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
  } catch (error: any) {
    console.error("Threads GET API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
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

    const { title = "New Chat", type = "general" } = await req.json().catch(() => ({}));

    await dbConnect();
    const newThread = new ChatHistory({
      userId: session.user.id,
      threadTitle: title,
      threadType: type,
      messages: [],
    });

    await newThread.save();

    return NextResponse.json(newThread);
  } catch (error: any) {
    console.error("Threads POST API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

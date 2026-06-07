import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";

export const dynamic = "force-dynamic";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const thread = await ChatHistory.findOne({ _id: id, userId: session.user.id }).lean();
    if (!thread) {
      return NextResponse.json({ message: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json(thread);
  } catch (error: any) {
    console.error("Thread GET API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { title } = await req.json();
    if (!title || !title.trim()) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 });
    }

    await dbConnect();
    const thread = await ChatHistory.findOne({ _id: id, userId: session.user.id });
    if (!thread) {
      return NextResponse.json({ message: "Thread not found" }, { status: 404 });
    }

    thread.threadTitle = title;
    await thread.save();

    return NextResponse.json(thread);
  } catch (error: any) {
    console.error("Thread PUT API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const result = await ChatHistory.deleteOne({ _id: id, userId: session.user.id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Thread deleted successfully" });
  } catch (error: any) {
    console.error("Thread DELETE API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

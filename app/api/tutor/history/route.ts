import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const chat = await ChatHistory.findOne({ userId: session.user.id });

    return NextResponse.json(chat ? chat.messages : []);
  } catch (error: any) {
    console.error("AI Tutor history GET error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    await ChatHistory.deleteOne({ userId: session.user.id });

    return NextResponse.json({ message: "Chat history cleared successfully" });
  } catch (error: any) {
    console.error("AI Tutor history DELETE error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Document from "@/models/Document";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const documents = await Document.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .select("filename fileUrl createdAt summary questions");

    return NextResponse.json(documents);
  } catch (error: any) {
    console.error("AI Hub documents GET error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

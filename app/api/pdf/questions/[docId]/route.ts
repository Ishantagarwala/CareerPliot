import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Document from "@/models/Document";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { docId } = await params;
    if (!docId) {
      return NextResponse.json({ message: "Missing document ID" }, { status: 400 });
    }

    await dbConnect();
    const doc = await Document.findOne({ _id: docId, userId: session.user.id });

    if (!doc) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: doc._id,
      filename: doc.filename,
      questions: doc.questions,
    });
  } catch (error: any) {
    console.error("PDF questions GET error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

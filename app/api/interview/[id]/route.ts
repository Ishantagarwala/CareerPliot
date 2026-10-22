import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import InterviewSession from "@/models/InterviewSession";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 });
    }

    await dbConnect();
    const interview = await InterviewSession.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!interview) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 });
    }

    return NextResponse.json(interview);
  } catch (error: unknown) {
    console.error("Interview detail GET error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 });
    }

    await dbConnect();
    const result = await InterviewSession.deleteOne({
      _id: id,
      userId: session.user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Interview deleted" });
  } catch (error: unknown) {
    console.error("Interview DELETE error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

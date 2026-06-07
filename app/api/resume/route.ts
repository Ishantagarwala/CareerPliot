import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import { defaultResumeContent } from "@/lib/resume";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const resumes = await Resume.find({ userId: session.user.id })
      .sort({ updatedAt: -1 })
      .select("title template atsAnalysis updatedAt createdAt");

    return NextResponse.json(resumes);
  } catch (error: any) {
    console.error("Resume GET error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    await dbConnect();
    const resume = await Resume.create({
      userId: session.user.id,
      title: body.title?.trim() || "My Resume",
      template: "modern",
      content: body.content || defaultResumeContent,
    });

    return NextResponse.json(resume, { status: 201 });
  } catch (error: any) {
    console.error("Resume POST error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const resume = await Resume.findOne({ _id: id, userId: session.user.id });

    if (!resume) {
      return NextResponse.json({ message: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json(resume);
  } catch (error: any) {
    console.error("Resume detail GET error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    await dbConnect();
    const resume = await Resume.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      {
        $set: {
          title: body.title,
          template: body.template || "modern",
          content: body.content,
        },
      },
      { new: true }
    );

    if (!resume) {
      return NextResponse.json({ message: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json(resume);
  } catch (error: any) {
    console.error("Resume detail PUT error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const result = await Resume.deleteOne({ _id: id, userId: session.user.id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Resume deleted" });
  } catch (error: any) {
    console.error("Resume detail DELETE error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

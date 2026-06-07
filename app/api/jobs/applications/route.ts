import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const applications = await Application.find({ userId: session.user.id })
      .populate("jobId")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(applications);
  } catch (error: any) {
    console.error("Applications GET API error:", error);
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

    const { jobId, customJob, status } = await req.json();
    await dbConnect();

    // Check if application already exists for this jobId
    if (jobId) {
      const existing = await Application.findOne({ userId: session.user.id, jobId });
      if (existing) {
        return NextResponse.json({ message: "Application already exists for this opportunity." }, { status: 400 });
      }
    }

    const newApp = new Application({
      userId: session.user.id,
      jobId: jobId || undefined,
      customJob: customJob || undefined,
      status: status || "saved",
      appliedDate: new Date(),
    });

    await newApp.save();

    return NextResponse.json(newApp);
  } catch (error: any) {
    console.error("Applications POST API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { applicationId, status, notes } = await req.json();
    if (!applicationId) {
      return NextResponse.json({ message: "Application ID required" }, { status: 400 });
    }

    await dbConnect();
    const app = await Application.findOne({ _id: applicationId, userId: session.user.id });
    if (!app) {
      return NextResponse.json({ message: "Application not found" }, { status: 404 });
    }

    if (status) app.status = status;
    if (notes !== undefined) app.notes = notes;

    await app.save();

    return NextResponse.json(app);
  } catch (error: any) {
    console.error("Applications PUT API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

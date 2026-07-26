import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";

export const dynamic = "force-dynamic";

function isMongoObjectId(value: unknown): value is string {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value) && value.length === 24;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, customJob, status, externalJobKey } = body;
    await dbConnect();

    // Live board jobs (remotive-*, jsearch-*, etc.) are NOT Mongo ObjectIds.
    // Persist them via customJob + externalJobKey so tracking works.
    const isExternal = externalJobKey || (jobId && !isMongoObjectId(jobId));
    const key = externalJobKey || (isExternal ? String(jobId) : undefined);

    if (key) {
      const existingExternal = await Application.findOne({
        userId: session.user.id,
        externalJobKey: key,
      });
      if (existingExternal) {
        return NextResponse.json(
          { message: "Application already exists for this opportunity." },
          { status: 400 }
        );
      }
    }

    if (jobId && isMongoObjectId(jobId)) {
      const existing = await Application.findOne({ userId: session.user.id, jobId });
      if (existing) {
        return NextResponse.json(
          { message: "Application already exists for this opportunity." },
          { status: 400 }
        );
      }
    }

    if (!customJob?.title && !(jobId && isMongoObjectId(jobId))) {
      return NextResponse.json(
        { message: "Job details are required to track this opportunity." },
        { status: 400 }
      );
    }

    const newApp = new Application({
      userId: session.user.id,
      jobId: jobId && isMongoObjectId(jobId) ? jobId : undefined,
      externalJobKey: key,
      customJob: customJob || undefined,
      status: status || "saved",
      appliedDate: new Date(),
    });

    await newApp.save();

    return NextResponse.json(newApp);
  } catch (error: any) {
    console.error("Applications POST API error:", error);
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "Application already exists for this opportunity." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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

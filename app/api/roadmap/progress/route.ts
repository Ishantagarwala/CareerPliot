import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Roadmap from "@/models/Roadmap";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { milestoneId, completed } = await req.json();

    if (!milestoneId) {
      return NextResponse.json({ message: "Missing milestoneId" }, { status: 400 });
    }

    await dbConnect();

    const roadmap = await Roadmap.findOne({ userId });
    if (!roadmap) {
      return NextResponse.json({ message: "Roadmap not found" }, { status: 404 });
    }

    // Find and update the milestone
    let milestoneFound = false;
    for (const stage of roadmap.stages) {
      for (const milestone of stage.milestones) {
        const mId = milestone._id?.toString();
        if (mId === milestoneId || mId === milestoneId?.toString()) {
          milestone.completed = completed;
          milestone.completedAt = completed ? new Date() : undefined;
          milestoneFound = true;
          break;
        }
      }
      if (milestoneFound) break;
    }

    if (!milestoneFound) {
      // Try finding by index as fallback
      for (const stage of roadmap.stages) {
        const idx = stage.milestones.findIndex(
          (m: any) => m.title === milestoneId
        );
        if (idx !== -1) {
          stage.milestones[idx].completed = completed;
          stage.milestones[idx].completedAt = completed ? new Date() : undefined;
          milestoneFound = true;
          break;
        }
      }
    }

    if (!milestoneFound) {
      return NextResponse.json({ message: "Milestone not found in this roadmap" }, { status: 404 });
    }

    // Recalculate currentStage
    const getStageCompletion = (stageName: "beginner" | "intermediate" | "advanced") => {
      const stage = roadmap.stages.find((s: { name: string }) => s.name === stageName);
      if (!stage || stage.milestones.length === 0) return true;
      return stage.milestones.every((m: { completed: boolean }) => m.completed);
    };

    const beginnerDone = getStageCompletion("beginner");
    const intermediateDone = getStageCompletion("intermediate");

    if (beginnerDone && intermediateDone) {
      roadmap.currentStage = "advanced";
    } else if (beginnerDone) {
      roadmap.currentStage = "intermediate";
    } else {
      roadmap.currentStage = "beginner";
    }

    await roadmap.save();

    return NextResponse.json({
      message: "Milestone updated successfully",
      roadmap: roadmap.toJSON(),
    });
  } catch (error: any) {
    console.error("Roadmap progress update error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

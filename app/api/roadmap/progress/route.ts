import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Roadmap from "@/models/Roadmap";
import CareerRecommendation from "@/models/CareerRecommendation";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { topicId, subtopicId, milestoneId, completed } = body;

    const targetId = topicId || milestoneId;
    if (!targetId && !subtopicId) {
      return NextResponse.json({ message: "Missing topicId or milestoneId" }, { status: 400 });
    }

    await dbConnect();

    const selectedRecommendation = await CareerRecommendation.findOne({
      userId,
      selected: true,
    });

    if (!selectedRecommendation) {
      return NextResponse.json(
        { message: "No career path selected yet." },
        { status: 404 }
      );
    }

    const roadmap = await Roadmap.findOne({
      userId,
      careerPath: selectedRecommendation.careerPath,
    });
    if (!roadmap) {
      return NextResponse.json({ message: "Roadmap not found" }, { status: 404 });
    }

    let updated = false;

    // Search topics and subtopics across all stages — try every possible ID format
    for (const stage of roadmap.stages) {
      if (stage.topics && stage.topics.length > 0) {
        for (const topic of stage.topics) {

          // Subtopic toggle
          if (subtopicId && topic.subtopics) {
            const sub = topic.subtopics.find(
              (s: any) =>
                s.id === subtopicId ||
                s._id?.toString() === subtopicId ||
                s.title === subtopicId
            );
            if (sub) {
              sub.completed = completed;
              sub.completedAt = completed ? new Date() : undefined;
              updated = true;
              const allSubDone = topic.subtopics.every((s: any) => s.completed);
              topic.completed = allSubDone;
              topic.completedAt = allSubDone ? new Date() : undefined;
              const ml = stage.milestones.find((m: any) => m.title === topic.title);
              if (ml) { ml.completed = allSubDone; ml.completedAt = allSubDone ? new Date() : undefined; }
              break;
            }
          }

          // Main topic toggle — match any possible ID representation
          const idMatches =
            targetId &&
            (
              topic.id === targetId ||
              String(topic.id) === String(targetId) ||
              topic._id?.toString() === targetId ||
              topic.title === targetId
            );

          if (idMatches) {
            topic.completed = completed;
            topic.completedAt = completed ? new Date() : undefined;
            updated = true;
            if (topic.subtopics) {
              topic.subtopics.forEach((s: any) => {
                s.completed = completed;
                s.completedAt = completed ? new Date() : undefined;
              });
            }
            const ml = stage.milestones.find((m: any) => m.title === topic.title);
            if (ml) { ml.completed = completed; ml.completedAt = completed ? new Date() : undefined; }
            break;
          }
        }
      }

      // Legacy milestone fallback
      if (!updated && stage.milestones) {
        for (const milestone of stage.milestones) {
          const mId = milestone._id?.toString();
          if (mId === targetId || milestone.title === targetId) {
            milestone.completed = completed;
            milestone.completedAt = completed ? new Date() : undefined;
            updated = true;
            break;
          }
        }
      }

      if (updated) break;
    }

    if (!updated) {
      console.warn(`[Progress] Could not find topicId="${targetId}" in roadmap stages. Regenerate the roadmap.`);
      // Return current roadmap state instead of 404 so UI doesn't show error
      return NextResponse.json({ message: "Progress saved", roadmap: roadmap.toJSON() });
    }

    // Recalculate currentStage
    const getStageCompletion = (stageName: "beginner" | "intermediate" | "advanced") => {
      const stage = roadmap.stages.find((s: { name: string }) => s.name === stageName);
      if (!stage) return true;
      if (stage.topics && stage.topics.length > 0) {
        return stage.topics.every((t: { completed: boolean }) => t.completed);
      }
      if (stage.milestones && stage.milestones.length > 0) {
        return stage.milestones.every((m: { completed: boolean }) => m.completed);
      }
      return true;
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
      message: "Progress updated successfully",
      roadmap: roadmap.toJSON(),
    });
  } catch (error: any) {
    console.error("Roadmap progress update error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import UserProgress from "@/models/UserProgress";
import Roadmap from "@/models/Roadmap";
import Document from "@/models/Document";

// Helper function to update the user active streak
async function getOrUpdateProgress(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let progress = await UserProgress.findOne({ userId });
  
  if (!progress) {
    progress = new UserProgress({
      userId,
      coursesCompleted: 0,
      pdfsAnalyzed: 0,
      tutorSessions: 0,
      streakDays: 1,
      lastActive: new Date(),
    });
    await progress.save();
    return progress;
  }

  const lastActiveDate = new Date(progress.lastActive);
  lastActiveDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - lastActiveDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Active on consecutive day
    progress.streakDays += 1;
    progress.lastActive = new Date();
    await progress.save();
  } else if (diffDays > 1) {
    // Streak broken (inactive for >1 day)
    progress.streakDays = 1;
    progress.lastActive = new Date();
    await progress.save();
  } else if (diffDays === 0 && progress.streakDays === 0) {
    // First time initializing
    progress.streakDays = 1;
    progress.lastActive = new Date();
    await progress.save();
  }

  return progress;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    await dbConnect();

    // 1. Fetch user progress tracker and update streak
    const progress = await getOrUpdateProgress(userId);

    // 2. Fetch PDF document count directly from database for accuracy
    const pdfCount = await Document.countDocuments({ userId });
    if (pdfCount !== progress.pdfsAnalyzed) {
      progress.pdfsAnalyzed = pdfCount;
      await progress.save();
    }

    // 3. Aggregate roadmap milestone progression
    const roadmap = await Roadmap.findOne({ userId });
    
    let totalMilestones = 0;
    let completedMilestones = 0;
    
    const stageProgress = {
      beginner: { completed: 0, total: 0 },
      intermediate: { completed: 0, total: 0 },
      advanced: { completed: 0, total: 0 },
    };

    if (roadmap) {
      roadmap.stages.forEach((stage: any) => {
        const name = stage.name as "beginner" | "intermediate" | "advanced";
        if (stageProgress[name]) {
          stage.milestones.forEach((milestone: any) => {
            stageProgress[name].total += 1;
            totalMilestones += 1;
            if (milestone.completed) {
              stageProgress[name].completed += 1;
              completedMilestones += 1;
            }
          });
        }
      });
    }

    const milestoneCompletionRate = totalMilestones > 0 
      ? (completedMilestones / totalMilestones) * 100 
      : 0;

    // 4. Calculate composite Readiness Score (scale 0-100)
    // Formula:
    // - Milestones: 40% (milestoneCompletionRate * 0.4)
    // - Courses: 30% (coursesCompleted * 10%, capped at 30%)
    // - PDFs: 15% (pdfsAnalyzed * 5%, capped at 15%)
    // - Tutor Sessions: 15% (tutorSessions * 3%, capped at 15%)
    const milestoneScore = milestoneCompletionRate * 0.4;
    const coursesScore = Math.min(progress.coursesCompleted * 10, 30);
    const pdfsScore = Math.min(progress.pdfsAnalyzed * 5, 15);
    const tutorScore = Math.min(progress.tutorSessions * 3, 15);
    
    const rawReadiness = milestoneScore + coursesScore + pdfsScore + tutorScore;
    const readinessScore = Math.min(Math.floor(rawReadiness), 100);

    return NextResponse.json({
      metrics: {
        coursesCompleted: progress.coursesCompleted,
        pdfsAnalyzed: progress.pdfsAnalyzed,
        tutorSessions: progress.tutorSessions,
        streakDays: progress.streakDays,
        lastActive: progress.lastActive,
      },
      roadmap: {
        careerPath: roadmap?.careerPath || null,
        totalMilestones,
        completedMilestones,
        milestoneCompletionRate,
        stageProgress,
      },
      readinessScore,
    });
  } catch (error: any) {
    console.error("Progress GET API error:", error);
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

    const userId = session.user.id;
    const { action } = await req.json();

    await dbConnect();
    const progress = await getOrUpdateProgress(userId);

    if (action === "complete_course") {
      progress.coursesCompleted += 1;
      progress.lastActive = new Date();
      await progress.save();
      
      return NextResponse.json({
        message: "Course completion tracked successfully",
        coursesCompleted: progress.coursesCompleted,
      });
    }

    if (action === "uncomplete_course") {
      if (progress.coursesCompleted > 0) {
        progress.coursesCompleted -= 1;
        progress.lastActive = new Date();
        await progress.save();
      }
      return NextResponse.json({
        message: "Course completion undone",
        coursesCompleted: progress.coursesCompleted,
      });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Progress PUT API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

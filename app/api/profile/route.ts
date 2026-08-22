import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import UserProfile from "@/models/UserProfile";
import User from "@/models/User";

const activeCourseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  platform: z.string().trim().min(1).max(100),
  progress: z.number().min(0).max(100),
  estCompletion: z.string().trim().min(1).max(100),
});

const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  currentCourse: z.string().trim().max(200).optional(),
  activeCurriculum: z.array(activeCourseSchema).max(50).optional(),
  futureGoals: z
    .object({
      shortTerm: z.array(z.string().trim().min(1).max(300)).max(20),
      longTerm: z.array(z.string().trim().min(1).max(300)).max(20),
    })
    .optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    await dbConnect();

    // Fetch user details from credentials record
    const user = await User.findById(userId).select("name email image");
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Fetch customized profile metrics
    let profile = await UserProfile.findOne({ userId });
    
    // Create an empty profile if not found, to simplify UI states
    if (!profile) {
      profile = new UserProfile({
        userId,
        interests: [],
        goals: "",
        subjects: [],
        skills: [],
        currentCourse: "",
        activeCurriculum: [],
        futureGoals: { shortTerm: [], longTerm: [] }
      });
      await profile.save();
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      image: user.image,
      currentCourse: profile.currentCourse || "",
      interests: profile.interests || [],
      goals: profile.goals || "",
      subjects: profile.subjects || [],
      skills: profile.skills || [],
      activeCurriculum: profile.activeCurriculum || [],
      futureGoals: profile.futureGoals || { shortTerm: [], longTerm: [] }
    });
  } catch (error: any) {
    console.error("Profile GET route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
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

    const parsed = profileUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid profile data", errors: z.treeifyError(parsed.error) },
        { status: 400 }
      );
    }
    const { name, currentCourse, activeCurriculum, futureGoals } = parsed.data;

    await dbConnect();

    // 1. Update user credentials name
    if (name) {
      await User.findByIdAndUpdate(userId, { name });
    }

    // 2. Update user profile information
    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          currentCourse: currentCourse !== undefined ? currentCourse : "",
          activeCurriculum: activeCurriculum !== undefined ? activeCurriculum : [],
          futureGoals: futureGoals !== undefined ? futureGoals : { shortTerm: [], longTerm: [] }
        }
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      message: "Profile updated successfully",
      profile: {
        name,
        currentCourse: profile.currentCourse,
        activeCurriculum: profile.activeCurriculum,
        futureGoals: profile.futureGoals
      }
    });
  } catch (error: any) {
    console.error("Profile PUT route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

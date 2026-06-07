import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import TeamPost from "@/models/TeamPost";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const posts = await TeamPost.find({ status: "open" })
      .populate("userId", "name email")
      .populate("hackathonId")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(posts);
  } catch (error: any) {
    console.error("Team Finder GET API error:", error);
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

    const { hackathonId, title, description, lookingFor, teamSize, contactMethod } = await req.json();

    if (!title || !description || !lookingFor || !teamSize || !contactMethod) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();
    const newPost = new TeamPost({
      userId: session.user.id,
      hackathonId: hackathonId || undefined,
      title,
      description,
      lookingFor,
      teamSize,
      currentMembers: 1,
      status: "open",
      contactMethod,
    });

    await newPost.save();

    return NextResponse.json(newPost);
  } catch (error: any) {
    console.error("Team Finder POST API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

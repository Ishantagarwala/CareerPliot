import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import CareerRecommendation from "@/models/CareerRecommendation";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { recommendationId } = await req.json();

    if (!recommendationId) {
      return NextResponse.json({ message: "Missing recommendationId" }, { status: 400 });
    }

    await dbConnect();

    // Verify this recommendation belongs to the user
    const recommendation = await CareerRecommendation.findOne({
      _id: recommendationId,
      userId,
    });

    if (!recommendation) {
      return NextResponse.json({ message: "Recommendation not found" }, { status: 404 });
    }

    // Unselect all other recommendations for this user
    await CareerRecommendation.updateMany({ userId }, { selected: false });

    // Select this one
    recommendation.selected = true;
    await recommendation.save();

    return NextResponse.json({
      message: "Career path selected successfully",
      recommendation,
    });
  } catch (error: any) {
    console.error("Select career route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import CareerRecommendation from "@/models/CareerRecommendation";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    await dbConnect();

    const recommendations = await CareerRecommendation.find({ userId }).sort({ matchScore: -1 });

    return NextResponse.json(recommendations);
  } catch (error: any) {
    console.error("Recommendations route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

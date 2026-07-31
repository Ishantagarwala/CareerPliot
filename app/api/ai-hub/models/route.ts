import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLlmClient } from "@/lib/llm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const client = getLlmClient();
    const list = await client.models.list();
    
    // Extract the model IDs
    const models = list.data.map((m) => m.id);

    return NextResponse.json({ models });
  } catch (error: any) {
    console.error("Failed to fetch models from custom router:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch models" },
      { status: 500 }
    );
  }
}

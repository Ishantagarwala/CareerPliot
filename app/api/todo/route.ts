import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Todo from "@/models/Todo";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    await dbConnect();

    // Fetch user todos, sorting older items first
    const todos = await Todo.find({ userId }).sort({ createdAt: 1 });

    return NextResponse.json(todos);
  } catch (error: any) {
    console.error("Todo GET route error:", error);
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

    const userId = session.user.id;
    const { text } = await req.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({ message: "Task text is required" }, { status: 400 });
    }

    await dbConnect();

    const todo = new Todo({
      userId,
      text: text.trim(),
      completed: false
    });
    await todo.save();

    return NextResponse.json(todo, { status: 201 });
  } catch (error: any) {
    console.error("Todo POST route error:", error);
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
    const { id, completed, text } = await req.json();

    if (!id) {
      return NextResponse.json({ message: "Task ID is required" }, { status: 400 });
    }

    await dbConnect();

    const updateData: any = {};
    if (completed !== undefined) updateData.completed = completed;
    if (text !== undefined) updateData.text = text.trim();

    const todo = await Todo.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true }
    );

    if (!todo) {
      return NextResponse.json({ message: "Todo not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(todo);
  } catch (error: any) {
    console.error("Todo PUT route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Task ID is required" }, { status: 400 });
    }

    await dbConnect();

    const todo = await Todo.findOneAndDelete({ _id: id, userId });

    if (!todo) {
      return NextResponse.json({ message: "Todo not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ message: "Todo deleted successfully" });
  } catch (error: any) {
    console.error("Todo DELETE route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

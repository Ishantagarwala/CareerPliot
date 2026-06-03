import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ status: 'connected', message: 'MongoDB connection successful!' });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: 'Failed to connect to MongoDB', error: error.message },
      { status: 500 }
    );
  }
}

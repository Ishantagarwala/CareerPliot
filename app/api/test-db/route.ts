import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';

export async function GET() {
  // Diagnostic endpoint — disabled in production to avoid leaking DB details.
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  try {
    await dbConnect();
    return NextResponse.json({ status: 'connected', message: 'MongoDB connection successful!' });
  } catch (error) {
    console.error('test-db connection error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to connect to MongoDB' },
      { status: 500 }
    );
  }
}

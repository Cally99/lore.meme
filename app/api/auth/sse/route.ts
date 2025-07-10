// app/api/auth/sse/route.ts - Simplified placeholder
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Simple placeholder - not needed for basic signup/login
  return NextResponse.json({ message: 'SSE not implemented' }, { status: 501 });
}
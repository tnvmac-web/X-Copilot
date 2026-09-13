import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.XCOPILOT_API_URL ||
  process.env.NEXT_PUBLIC_XCOPILOT_API_URL ||
  "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });

    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "X-Copilot backend is unavailable" },
      { status: 502 }
    );
  }
}

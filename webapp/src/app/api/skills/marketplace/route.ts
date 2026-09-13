import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.XCOPILOT_API_URL ||
  process.env.NEXT_PUBLIC_XCOPILOT_API_URL ||
  "http://127.0.0.1:8000";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/skills/marketplace`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Skills API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch marketplace" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoId } = body;

    const response = await fetch(`${API_BASE_URL}/api/skills/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoId }),
    });

    if (!response.ok) {
      throw new Error(`Install API error: ${response.status}`);
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to install skill" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.XCOPILOT_API_URL ||
  process.env.NEXT_PUBLIC_XCOPILOT_API_URL ||
  "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      cache: "no-store",
      headers: request.headers.get("authorization")
        ? { Authorization: request.headers.get("authorization") as string }
        : {},
    });

    if (!response.ok) {
      throw new Error(`Projects API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, path, description } = body;

    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization") as string }
          : {}),
      },
      body: JSON.stringify({ name, path, description }),
    });

    if (!response.ok) {
      throw new Error(`Projects API error: ${response.status}`);
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

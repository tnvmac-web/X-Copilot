import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.XCOPILOT_API_URL ||
  process.env.NEXT_PUBLIC_XCOPILOT_API_URL ||
  "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const search = searchParams.get("search") || "";

    const response = await fetch(
      `${API_BASE_URL}/api/memory?type=${type}&search=${search}`,
      {
        cache: "no-store",
        headers: request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization") as string }
          : {},
      }
    );

    if (!response.ok) {
      return NextResponse.json(await response.json(), { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch memories" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/memory`, {
      method: "DELETE",
      headers: request.headers.get("authorization")
        ? { Authorization: request.headers.get("authorization") as string }
        : {},
    });

    if (!response.ok) {
      return NextResponse.json(await response.json(), { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to clear memories" },
      { status: 500 }
    );
  }
}

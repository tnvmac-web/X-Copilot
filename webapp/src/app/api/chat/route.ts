import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // For demo purposes, return a mock response
    // In production, integrate with actual model providers
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from user" },
        { status: 400 }
      );
    }

    // Simulate model response
    await new Promise(resolve => setTimeout(resolve, 1000));

    const responses = [
      `I understand you're asking about "${lastMessage.content}". Let me help you with that.`,
      `That's an interesting question about "${lastMessage.content}". Here's what I think...`,
      `Regarding "${lastMessage.content}", I can provide some insights...`,
      `I'll help you with "${lastMessage.content}". Let me break this down...`,
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return NextResponse.json({
      content: randomResponse,
      model: model || "gpt-4o-mini",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
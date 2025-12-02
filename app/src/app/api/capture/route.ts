import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { source, contentType, text } = await request.json();

    if (!contentType) {
      return NextResponse.json(
        { error: "contentType is required" },
        { status: 400 }
      );
    }

    // Create the capture via Convex
    const captureId = await convex.mutation(api.captures.create, {
      source: source || "web",
      contentType,
      text,
    });

    return NextResponse.json({
      success: true,
      captureId,
    });
  } catch (error) {
    console.error("Error in /api/capture:", error);
    return NextResponse.json(
      { error: "Failed to create capture" },
      { status: 500 }
    );
  }
}




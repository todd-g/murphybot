import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// GET /api/events - Export events as ICS
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";
  
  try {
    if (format === "ics") {
      // Get ICS formatted calendar data
      const icsData = await convex.query(api.events.getIcsData, {});
      
      return new Response(icsData, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": "attachment; filename=murphybot-events.ics",
        },
      });
    } else {
      // Return JSON of all events
      const events = await convex.query(api.events.getAll, {});
      return NextResponse.json({ events });
    }
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}


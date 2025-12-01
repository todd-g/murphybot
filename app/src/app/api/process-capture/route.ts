import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// JD area info for AI context
const JD_AREAS = [
  { prefix: "0", name: "Index", range: "00-09", folder: "00-index", description: "System index and meta information" },
  { prefix: "1", name: "Reference", range: "10-19", folder: "10-reference", description: "Reference materials and documentation" },
  { prefix: "2", name: "Projects", range: "20-29", folder: "20-projects", description: "Active projects and work" },
  { prefix: "3", name: "People", range: "30-39", folder: "30-people", description: "People, contacts, and relationships" },
  { prefix: "4", name: "Media", range: "40-49", folder: "40-media", description: "Books, movies, TV shows, games, music" },
  { prefix: "5", name: "Events", range: "50-59", folder: "50-events", description: "Events, calendar, and scheduling" },
  { prefix: "6", name: "Ideas", range: "60-69", folder: "60-ideas", description: "Ideas, brainstorms, and creative thoughts" },
  { prefix: "7", name: "Home", range: "70-79", folder: "70-home", description: "Home and household management" },
  { prefix: "8", name: "Personal", range: "80-89", folder: "80-personal", description: "Personal notes and life" },
  { prefix: "9", name: "Archive", range: "90-99", folder: "90-archive", description: "Archived and historical content" },
];

interface ProcessRequest {
  captureId: string;
  autoCreate?: boolean;
}

interface AISuggestion {
  area: string;
  areaName: string;
  folder: string;
  jdId: string;
  title: string;
  content: string;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const { captureId, autoCreate } = (await request.json()) as ProcessRequest;

    if (!captureId) {
      return NextResponse.json(
        { error: "captureId is required" },
        { status: 400 }
      );
    }

    // Fetch the capture
    const capture = await convex.query(api.captures.get, {
      id: captureId as Id<"capture_queue">,
    });

    if (!capture) {
      return NextResponse.json(
        { error: "Capture not found" },
        { status: 404 }
      );
    }

    // Update status to processing
    await convex.mutation(api.captures.updateStatus, {
      id: captureId as Id<"capture_queue">,
      status: "processing",
    });

    // Build the prompt for Claude
    const systemPrompt = `You are an assistant that helps organize captured notes into a personal knowledge base using the Johnny.Decimal system.

The knowledge base has these areas:
${JD_AREAS.map((a) => `- ${a.range} ${a.name}: ${a.description}`).join("\n")}

Your job is to:
1. Analyze the captured content
2. Suggest the best area and category
3. Generate a proper JD ID (e.g., 40.03 for Media category 03)
4. Create a clean title
5. Format the content as proper markdown

Respond with JSON in this exact format:
{
  "area": "4",
  "jdId": "40.03",
  "title": "Short descriptive title",
  "content": "# Title\\n\\nFormatted markdown content...",
  "reasoning": "Brief explanation of why this category was chosen"
}`;

    const captureContent = capture.text || "[No text content]";
    const hasImage = !!capture.fileUrl;

    const userMessage = `Please process this captured content and suggest where it should go:

Source: ${capture.source}
Content Type: ${capture.contentType}
${hasImage ? `Has attached image: ${capture.fileUrl}` : ""}

Content:
${captureContent}

Analyze this and provide your JSON response.`;

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Anthropic API error:", response.status, errorData);
      
      // Reset status on error
      await convex.mutation(api.captures.updateStatus, {
        id: captureId as Id<"capture_queue">,
        status: "pending",
      });
      
      return NextResponse.json(
        { error: `AI processing failed: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const responseText = data.content
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("\n");

    // Parse the JSON response
    let suggestion: AISuggestion;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Find the area info
      const areaInfo = JD_AREAS.find((a) => a.prefix === parsed.area) || JD_AREAS[6]; // Default to Ideas
      
      suggestion = {
        area: parsed.area || "6",
        areaName: areaInfo.name,
        folder: areaInfo.folder,
        jdId: parsed.jdId || `${areaInfo.prefix}0.01`,
        title: parsed.title || "Untitled Note",
        content: parsed.content || `# ${parsed.title}\n\n${captureContent}`,
        reasoning: parsed.reasoning || "AI suggestion",
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback: put in Ideas
      suggestion = {
        area: "6",
        areaName: "Ideas",
        folder: "60-ideas",
        jdId: "60.01",
        title: captureContent.slice(0, 50).replace(/\n/g, " "),
        content: `# Note\n\n${captureContent}`,
        reasoning: "Could not parse AI suggestion, defaulting to Ideas",
      };
    }

    // If autoCreate is true, create the note immediately
    if (autoCreate) {
      const slug = suggestion.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const path = `${suggestion.folder}/${suggestion.jdId}-${slug}.md`;

      try {
        const result = await convex.mutation(api.notes.create, {
          jdId: suggestion.jdId,
          path,
          title: suggestion.title,
          content: suggestion.content,
        });

        // Mark capture as done
        await convex.mutation(api.captures.markDone, {
          id: captureId as Id<"capture_queue">,
        });

        return NextResponse.json({
          success: true,
          created: true,
          noteId: result.id,
          path,
          suggestion,
        });
      } catch (createError) {
        console.error("Failed to create note:", createError);
        return NextResponse.json({
          success: true,
          created: false,
          error: "Failed to create note",
          suggestion,
        });
      }
    }

    // Return the suggestion for user approval
    return NextResponse.json({
      success: true,
      created: false,
      suggestion,
    });
  } catch (error) {
    console.error("Error in /api/process-capture:", error);
    return NextResponse.json(
      { error: `Failed to process capture: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}


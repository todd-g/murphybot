"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

interface ProcessResult {
  processed: boolean;
  reason?: string;
  error?: string;
  noteId?: Id<"notes">;
  path?: string;
  title?: string;
  area?: string;
}

// JD area info for AI context
const JD_AREAS = [
  { prefix: "0", name: "Index", folder: "00-index", description: "System index and meta information" },
  { prefix: "1", name: "Reference", folder: "10-reference", description: "Reference materials and documentation" },
  { prefix: "2", name: "Projects", folder: "20-projects", description: "Active projects and work" },
  { prefix: "3", name: "People", folder: "30-people", description: "People, contacts, and relationships" },
  { prefix: "4", name: "Media", folder: "40-media", description: "Books, movies, TV shows, games, music" },
  { prefix: "5", name: "Events", folder: "50-events", description: "Events, calendar, and scheduling" },
  { prefix: "6", name: "Ideas", folder: "60-ideas", description: "Ideas, brainstorms, and creative thoughts" },
  { prefix: "7", name: "Home", folder: "70-home", description: "Home and household management" },
  { prefix: "8", name: "Personal", folder: "80-personal", description: "Personal notes and life" },
  { prefix: "9", name: "Archive", folder: "90-archive", description: "Archived and historical content" },
];

interface AISuggestion {
  area: string;
  areaName: string;
  folder: string;
  jdId: string;
  title: string;
  content: string;
  reasoning: string;
}

// Process the next pending capture (runs in Node.js environment)
export const processNextCapture = internalAction({
  args: {},
  handler: async (ctx): Promise<ProcessResult> => {
    // Get the oldest pending capture
    const captures = await ctx.runQuery(internal.processingHelpers.getOldestPending);
    
    if (!captures || captures.length === 0) {
      console.log("No pending captures to process");
      return { processed: false, reason: "No pending captures" };
    }
    
    const capture = captures[0];
    console.log(`Processing capture: ${capture._id}`);
    
    // Mark as processing
    await ctx.runMutation(internal.processingHelpers.updateCaptureStatus, {
      id: capture._id,
      status: "processing",
    });
    
    try {
      // Get API key from environment
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY not configured in Convex dashboard");
      }
      
      // Build the prompt
      const systemPrompt = `You are an assistant that helps organize captured notes into a personal knowledge base using the Johnny.Decimal system.

The knowledge base has these areas:
${JD_AREAS.map((a) => `- ${a.prefix}0-${a.prefix}9 ${a.name}: ${a.description}`).join("\n")}

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
        throw new Error(`Claude API error: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      const responseText = data.content
        .filter((block: { type: string }) => block.type === "text")
        .map((block: { text: string }) => block.text)
        .join("\n");

      // Parse the JSON response
      let suggestion: AISuggestion;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        const parsed = JSON.parse(jsonMatch[0]);
        const areaInfo = JD_AREAS.find((a) => a.prefix === parsed.area) || JD_AREAS[6];
        
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
        // Fallback to Ideas
        suggestion = {
          area: "6",
          areaName: "Ideas",
          folder: "60-ideas",
          jdId: "60.01",
          title: captureContent.slice(0, 50).replace(/\n/g, " ").trim() || "New Note",
          content: `# Note\n\n${captureContent}`,
          reasoning: "Could not parse AI suggestion, defaulting to Ideas",
        };
      }

      // Create the note
      const slug = suggestion.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const path = `${suggestion.folder}/${suggestion.jdId}-${slug}.md`;

      const noteResult: { id: Id<"notes">; action: string } = await ctx.runMutation(internal.processingHelpers.createNoteInternal, {
        jdId: suggestion.jdId,
        path,
        title: suggestion.title,
        content: suggestion.content,
      });

      // Log the activity
      await ctx.runMutation(internal.processingHelpers.logActivity, {
        action: "created",
        captureId: capture._id,
        noteId: noteResult.id,
        notePath: path,
        noteTitle: suggestion.title,
        suggestedArea: suggestion.areaName,
        reasoning: suggestion.reasoning,
      });

      // Mark capture as done
      await ctx.runMutation(internal.processingHelpers.updateCaptureStatus, {
        id: capture._id,
        status: "done",
      });

      console.log(`Successfully processed capture ${capture._id} -> ${path}`);
      return {
        processed: true,
        noteId: noteResult.id,
        path,
        title: suggestion.title,
        area: suggestion.areaName,
      };
      
    } catch (error) {
      console.error("Error processing capture:", error);
      
      // Reset to pending on error
      await ctx.runMutation(internal.processingHelpers.updateCaptureStatus, {
        id: capture._id,
        status: "pending",
      });
      
      return {
        processed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

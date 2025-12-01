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
  action: "create" | "append";
  existingNoteId?: string;
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
    console.log(`Processing capture: ${capture._id} [v2 with debug]`);
    
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
      
      // Fetch existing notes for context
      const existingNotes = await ctx.runQuery(internal.processingHelpers.getAllNotes);
      
      console.log("=== NOTES CONTEXT DEBUG ===");
      console.log(`Fetched ${existingNotes.length} notes from database`);
      
      // Sort notes by JD ID to show proper organization
      const sortedNotes = [...existingNotes].sort((a, b) => a.jdId.localeCompare(b.jdId));
      
      // Log each note title
      sortedNotes.forEach(n => {
        console.log(`  - ${n.jdId}: ${n.title} (${n.content.length} chars)`);
      });
      
      // Build FULL notes context - include complete content so AI understands:
      // 1. The actual facts/information stored
      // 2. The organizational patterns and formatting style
      const notesContext = sortedNotes.map(n => {
        return `=== NOTE [${n._id}] ===
JD ID: ${n.jdId}
Path: ${n.path}
Title: ${n.title}

${n.content}
=== END NOTE ===`;
      }).join("\n\n");
      
      console.log(`Total notes context length: ${notesContext.length} chars`);
      
      // Build the prompt
      const systemPrompt = `You are an assistant that helps organize captured notes into a personal knowledge base using the Johnny.Decimal system.

===========================================
JOHNNY.DECIMAL SYSTEM EXPLAINED
===========================================

Johnny.Decimal is a hierarchical organization system with THREE levels:

1. AREAS (10-19, 20-29, etc.) - Broad life categories
2. CATEGORIES (X1, X2, X3...) - Specific topics within an area  
3. IDs (XX.YY) - Individual items or notes

EXAMPLE for Area 70 (Home):
- 70 = Home (the area)
- 71 = Pets (a category - all pet-related stuff)
- 72 = Vehicles (another category)
- 73 = Maintenance (another category)
- 71.01 = First pet note (e.g., "Our dog Maggie")
- 71.02 = Second pet note (e.g., "Vet records")
- 72.01 = First vehicle note (e.g., "Toyota Camry")

KEY PRINCIPLES:
- Categories (X1, X2, X3) GROUP related things together
- The .YY number is just a sequential ID within that category
- ONE category should contain ALL notes about that topic
- Don't spread related items across different categories

EXAMPLE for Area 30 (People):
- 31 = Family (category for all family members)
- 32 = Friends
- 33 = Professional contacts
- 31.01 = Note about family member 1
- 31.02 = Note about family member 2

The knowledge base has these AREAS:
${JD_AREAS.map((a) => `- ${a.prefix}0-${a.prefix}9 ${a.name}: ${a.description}`).join("\n")}

===========================================
COMPLETE KNOWLEDGE BASE (FULL CONTENT)
===========================================

Study these notes carefully. They show:
1. What information already exists (facts, people, projects, etc.)
2. How the owner organizes things (lists vs individual notes, formatting patterns)
3. The JD IDs and paths already in use

${notesContext || "(No notes yet)"}

CRITICAL RULES FOR ORGANIZING:

1. LOOK AT EXISTING CATEGORIES FIRST
   - Check what categories (X1, X2, X3) already exist in each area
   - If a category exists for this topic, use it
   - If no category exists, create one with the NEXT available number

2. PREFER APPENDING to existing notes when content fits:
   - New movie → append to existing movies note
   - New family info → append to existing family note
   - Same topic = same note (don't create duplicates)

3. CREATE NEW NOTE only when:
   - This is a genuinely NEW category not yet in the system
   - OR it's a distinct sub-item that deserves its own note

4. ID ASSIGNMENT:
   - For NEW categories: Use next available (if 71 exists, new category = 72)
   - For items in existing category: Use category.next (if 71.01 exists, next = 71.02)
   - The .YY is sequential within each category

5. THINK HIERARCHICALLY:
   - "Dog named Maggie" → Pets category → 71.01 (not 70.02)
   - "Family member" → Family category → 31.01
   - Group related things in the SAME category

Your job is to:
1. Analyze the captured content (including any images)
2. Check if it belongs in an EXISTING note (append) or needs a NEW note (create)
3. Format the content as proper markdown
4. If there's an image, include a description of what's in the image

Respond with JSON in this exact format:
{
  "action": "append" or "create",
  "existingNoteId": "ID from the list above (only if action is append)",
  "area": "4",
  "jdId": "40.03",
  "title": "For new notes: the title. For append: the section header to add",
  "content": "The markdown content to add (for append: just the new section, for create: full note)",
  "reasoning": "Why you chose to append/create and to this location"
}`;

      const captureContent = capture.text || "[No text content]";
      
      // Debug: log what we have in the capture
      console.log("=== CAPTURE DEBUG ===");
      console.log("fileStorageId:", capture.fileStorageId);
      console.log("fileUrl:", capture.fileUrl);
      console.log("text:", capture.text?.slice(0, 100));
      console.log("contentType:", capture.contentType);
      
      const hasImage = !!capture.fileUrl;
      console.log("hasImage:", hasImage);

      // Build message content - can be multimodal with images
      const messageContent: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];

      // If there's an image, fetch it and add as base64
      let imageAdded = false;
      if (hasImage && capture.fileUrl) {
        try {
          console.log(`Fetching image from URL: ${capture.fileUrl}`);
          const imageResponse = await fetch(capture.fileUrl);
          
          console.log(`Image fetch response: ${imageResponse.status} ${imageResponse.statusText}`);
          console.log(`Content-Type header: ${imageResponse.headers.get("content-type")}`);
          
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            console.log(`Image buffer size: ${imageBuffer.byteLength} bytes`);
            
            const base64Image = Buffer.from(imageBuffer).toString("base64");
            
            // Get media type from Content-Type header, fallback to jpeg
            const contentType = imageResponse.headers.get("content-type");
            let mediaType = "image/jpeg";
            if (contentType?.includes("png")) mediaType = "image/png";
            else if (contentType?.includes("gif")) mediaType = "image/gif";
            else if (contentType?.includes("webp")) mediaType = "image/webp";
            else if (contentType?.includes("jpeg") || contentType?.includes("jpg")) mediaType = "image/jpeg";
            
            messageContent.push({
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image,
              },
            });
            imageAdded = true;
            console.log(`SUCCESS: Added image to message (${mediaType}, ${base64Image.length} chars base64)`);
          } else {
            console.error(`FAILED to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
          }
        } catch (imageError) {
          console.error("EXCEPTION fetching image:", imageError);
        }
      } else {
        console.log("No image to fetch (fileUrl is empty or undefined)");
      }

      // Add the text content
      messageContent.push({
        type: "text",
        text: `Please process this captured content and suggest where it should go:

Source: ${capture.source}
Content Type: ${capture.contentType}
${imageAdded ? "IMPORTANT: An image is attached above. Please LOOK AT THE IMAGE and describe what you see. Base your categorization on the image content!" : ""}
${hasImage && !imageAdded ? "(Note: There was an image but it could not be loaded)" : ""}

Text content:
${captureContent}

${imageAdded ? "Remember: Analyze the IMAGE above and describe what you see in the content field!" : ""}

Provide your JSON response.`,
      });

      // Call Claude API - using Sonnet 3.5 for vision + large context
      console.log("=== CLAUDE REQUEST DEBUG ===");
      console.log(`Message content blocks: ${messageContent.length}`);
      console.log(`Message content types: ${messageContent.map(c => c.type).join(", ")}`);
      console.log(`imageAdded flag: ${imageAdded}`);
      
      // Log the text content being sent
      const textContent = messageContent.find(c => c.type === "text");
      if (textContent && textContent.text) {
        console.log(`Text content length: ${textContent.text.length} chars`);
        console.log(`Text content preview: ${textContent.text.slice(0, 200)}...`);
      }
      
      // Log system prompt info
      console.log(`System prompt length: ${systemPrompt.length} chars`);
      console.log(`System prompt contains notes: ${systemPrompt.includes("=== NOTE")}`);
      console.log(`System prompt preview (first 500 chars): ${systemPrompt.slice(0, 500)}`);
      
      const requestBody = {
        model: "claude-3-haiku-20240307", // Claude 3 Haiku - fast, supports vision
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
      };
      
      console.log(`Full request: model=${requestBody.model}, system_length=${systemPrompt.length}, messages=${requestBody.messages.length}`);
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Claude API error response: ${errorData}`);
        throw new Error(`Claude API error: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      console.log(`Claude response received, content blocks: ${data.content?.length}`);
      const responseText = data.content
        .filter((block: { type: string }) => block.type === "text")
        .map((block: { text: string }) => block.text)
        .join("\n");

      // Parse the JSON response
      console.log(`Claude raw response: ${responseText.slice(0, 500)}`);
      
      let suggestion: AISuggestion;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error(`No JSON found in response. Full text: ${responseText}`);
          throw new Error("No JSON found in response");
        }
        console.log(`Parsed JSON match: ${jsonMatch[0].slice(0, 300)}`);
        const parsed = JSON.parse(jsonMatch[0]);
        // Extract the first digit from area (Claude returns "80" but we need "8")
        const areaPrefix = String(parsed.area).charAt(0);
        const areaInfo = JD_AREAS.find((a) => a.prefix === areaPrefix) || JD_AREAS[6];
        
        suggestion = {
          action: parsed.action === "append" ? "append" : "create",
          existingNoteId: parsed.existingNoteId,
          area: parsed.area || "6",
          areaName: areaInfo.name,
          folder: areaInfo.folder,
          jdId: parsed.jdId || `${areaInfo.prefix}0.01`,
          title: parsed.title || "Untitled Note",
          content: parsed.content || `# ${parsed.title}\n\n${captureContent}`,
          reasoning: parsed.reasoning || "AI suggestion",
        };
      } catch (parseError) {
        // Fallback to Ideas - create new
        suggestion = {
          action: "create",
          area: "6",
          areaName: "Ideas",
          folder: "60-ideas",
          jdId: "60.01",
          title: captureContent.slice(0, 50).replace(/\n/g, " ").trim() || "New Note",
          content: `# Note\n\n${captureContent}`,
          reasoning: "Could not parse AI suggestion, defaulting to Ideas",
        };
      }

      let noteResult: { id: Id<"notes">; action: string; path?: string; title?: string };
      let finalPath: string;
      let finalTitle: string;

      if (suggestion.action === "append" && suggestion.existingNoteId) {
        // Append to existing note
        try {
          noteResult = await ctx.runMutation(internal.processingHelpers.appendToNote, {
            noteId: suggestion.existingNoteId as Id<"notes">,
            appendContent: suggestion.content,
          });
          finalPath = noteResult.path || suggestion.existingNoteId;
          finalTitle = noteResult.title || suggestion.title;
        } catch (appendError) {
          console.error("Failed to append, falling back to create:", appendError);
          // Fall back to create if append fails
          suggestion.action = "create";
          const slug = suggestion.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          finalPath = `${suggestion.folder}/${suggestion.jdId}-${slug}.md`;
          
          noteResult = await ctx.runMutation(internal.processingHelpers.createNoteInternal, {
            jdId: suggestion.jdId,
            path: finalPath,
            title: suggestion.title,
            content: suggestion.content,
          });
          finalTitle = suggestion.title;
        }
      } else {
        // Create new note
        const slug = suggestion.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        finalPath = `${suggestion.folder}/${suggestion.jdId}-${slug}.md`;
        finalTitle = suggestion.title;

        noteResult = await ctx.runMutation(internal.processingHelpers.createNoteInternal, {
          jdId: suggestion.jdId,
          path: finalPath,
          title: finalTitle,
          content: suggestion.content,
        });
      }

      // Log the activity with debug info
      await ctx.runMutation(internal.processingHelpers.logActivity, {
        action: suggestion.action === "append" ? "appended" : "created",
        captureId: capture._id,
        noteId: noteResult.id,
        notePath: finalPath,
        noteTitle: finalTitle,
        suggestedArea: suggestion.areaName,
        reasoning: suggestion.reasoning,
        debug: {
          notesInContext: sortedNotes.length,
          imageAttached: imageAdded,
          systemPromptLength: systemPrompt.length,
          captureText: capture.text?.slice(0, 200),
          captureHadImage: hasImage,
          imageUrl: capture.fileUrl || undefined,
        },
      });

      // Mark capture as done
      await ctx.runMutation(internal.processingHelpers.updateCaptureStatus, {
        id: capture._id,
        status: "done",
      });

      console.log(`Successfully processed capture ${capture._id} -> ${finalPath} (${suggestion.action})`);
      return {
        processed: true,
        noteId: noteResult.id,
        path: finalPath,
        title: finalTitle,
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

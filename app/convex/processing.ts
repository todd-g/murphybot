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

// Category name lookup - maps category number to folder name
const CATEGORY_FOLDERS: Record<string, string> = {
  // Index (0X)
  "01": "01-system", "02": "02-templates", "03": "03-settings",
  // Reference (1X)
  "11": "11-technical", "12": "12-howto", "13": "13-checklists", "14": "14-resources",
  // Projects (2X)
  "21": "21-active", "22": "22-planned", "23": "23-completed",
  // People (3X)
  "31": "31-family", "32": "32-friends", "33": "33-professional", "34": "34-providers",
  // Media (4X)
  "41": "41-movies", "42": "42-tv", "43": "43-books", "44": "44-podcasts", "45": "45-music", "46": "46-games",
  // Events (5X)
  "51": "51-local", "52": "52-travel", "53": "53-appointments", "54": "54-holidays",
  // Ideas (6X)
  "61": "61-projects", "62": "62-business", "63": "63-creative", "64": "64-random",
  // Home (7X)
  "71": "71-pets", "72": "72-vehicles", "73": "73-maintenance", "74": "74-purchases", "75": "75-utilities",
  // Personal (8X)
  "81": "81-journal", "82": "82-goals", "83": "83-health", "84": "84-finances",
  // Archive (9X)
  "91": "91-projects", "92": "92-events", "93": "93-reference",
};

// Get folder path from JD ID (e.g., "41.01" -> "41-movies")
function getCategoryFolder(jdId: string): string {
  const category = jdId.split(".")[0]; // "41.01" -> "41"
  if (CATEGORY_FOLDERS[category]) {
    return CATEGORY_FOLDERS[category];
  }
  // Fallback: if it's an X0 (area index), use area folder
  const areaPrefix = category.charAt(0);
  const areaInfo = JD_AREAS.find((a) => a.prefix === areaPrefix);
  if (areaInfo && category.endsWith("0")) {
    return `${category}-${areaInfo.name.toLowerCase().replace(/\s+/g, "-")}`;
  }
  // Last fallback: just use the category number with generic name
  return `${category}-notes`;
}

// JD area info for AI context - with suggested categories
const JD_AREAS = [
  { prefix: "0", name: "Index", description: "System index and meta information",
    categories: "01=System, 02=Templates, 03=Settings" },
  { prefix: "1", name: "Reference", description: "Reference materials and documentation",
    categories: "11=Technical Docs, 12=How-To Guides, 13=Checklists, 14=Resources" },
  { prefix: "2", name: "Projects", description: "Active projects and work",
    categories: "21=Active Projects, 22=Planned Projects, 23=Completed Projects" },
  { prefix: "3", name: "People", description: "People, contacts, and relationships",
    categories: "31=Family, 32=Friends, 33=Professional, 34=Service Providers" },
  { prefix: "4", name: "Media", description: "Books, movies, TV shows, games, music",
    categories: "41=Movies, 42=TV Shows, 43=Books, 44=Podcasts, 45=Music, 46=Games" },
  { prefix: "5", name: "Events", description: "Events, calendar, and scheduling",
    categories: "51=Local Events, 52=Travel, 53=Appointments, 54=Holidays" },
  { prefix: "6", name: "Ideas", description: "Ideas, brainstorms, and creative thoughts",
    categories: "61=Project Ideas, 62=Business Ideas, 63=Creative Writing, 64=Random Thoughts" },
  { prefix: "7", name: "Home", description: "Home and household management",
    categories: "71=Pets, 72=Vehicles, 73=Maintenance, 74=Purchases, 75=Utilities" },
  { prefix: "8", name: "Personal", description: "Personal notes and life",
    categories: "81=Journal, 82=Goals, 83=Health, 84=Finances" },
  { prefix: "9", name: "Archive", description: "Archived and historical content",
    categories: "91=Completed Projects, 92=Past Events, 93=Old Reference" },
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
JOHNNY.DECIMAL - THREE LEVEL HIERARCHY
===========================================

Johnny.Decimal has EXACTLY three levels. Understanding this is CRITICAL:

LEVEL 1: AREAS (X0-X9)
  - The tens digit defines the AREA
  - 30-39 = People, 40-49 = Media, 70-79 = Home, etc.
  - X0.00 is ONLY for the area's index/overview file

LEVEL 2: CATEGORIES (X1, X2, X3... X9)  
  - The ones digit (1-9) defines the CATEGORY within an area
  - Categories GROUP related topics together
  - Example: In 40-49 Media area:
    - 41 = Movies (ALL movie-related notes go here)
    - 42 = TV Shows
    - 43 = Books
    - 44 = Podcasts
    - 45 = Music
    - 46 = Games

LEVEL 3: IDs (XX.YY)
  - The decimal number is the specific NOTE within a category
  - Sequential: .01, .02, .03, etc.
  - Example: 41.01 = first movies note, 41.02 = second movies note

===========================================
AREAS AND THEIR CATEGORIES
===========================================

${JD_AREAS.map((a) => `${a.prefix}0-${a.prefix}9 ${a.name}: ${a.description}
  Categories: ${a.categories}`).join("\n\n")}

===========================================
CRITICAL RULES - READ CAREFULLY
===========================================

RULE 1: NEVER USE X0.YY FOR CONTENT
  - WRONG: 40.01 for a movie, 30.01 for family, 70.02 for pets
  - RIGHT: 41.01 for a movie, 31.01 for family, 71.01 for pets
  - X0.00 is ONLY for the area index file (e.g., 40.00 = Media Index)

RULE 2: USE CATEGORIES TO GROUP RELATED CONTENT
  - A horror movie → 41 (Movies category) → 41.01
  - Info about dog → 71 (Pets category) → 71.01
  - Family member info → 31 (Family category) → 31.01
  - A video game → 46 (Games category) → 46.01

RULE 3: FOLDER STRUCTURE MATCHES CATEGORIES
  - Category 41 (Movies) → folder "41-movies"
  - Category 71 (Pets) → folder "71-pets"
  - Category 31 (Family) → folder "31-family"
  - Path format: {category}-{name}/{jdId}-{slug}.md

RULE 4: PREFER APPENDING TO EXISTING NOTES
  - New movie to watch → append to existing 41.01 movies list
  - New info about existing person → append to their note
  - Same topic = same note (don't create duplicates)

===========================================
COMPLETE KNOWLEDGE BASE (FULL CONTENT)
===========================================

Study these notes carefully. They show:
1. What information already exists (people, projects, etc.)
2. The organizational patterns already in use
3. The JD IDs and paths already assigned

${notesContext || "(No notes yet)"}

===========================================
EVENT SYNTAX (IMPORTANT!)
===========================================

When the captured content mentions a DATE, APPOINTMENT, EVENT, or SCHEDULED ACTIVITY,
include an event line in the note content using this EXACT format:

📅 Event: Title | YYYY-MM-DD | HH:MM | Location

Examples:
📅 Event: Dentist Appointment | 2025-12-15 | 14:00 | Dr. Smith's Office
📅 Event: Christmas Dinner | 2025-12-25 | 18:00 | Grandma's House
📅 Event: Basketball Practice Start | 2026-01-11

Rules for events:
- Date is REQUIRED in YYYY-MM-DD format
- Time is OPTIONAL (24-hour format HH:MM)
- Location is OPTIONAL
- Separate fields with | (pipe)
- Put the event line in the note content where it's relevant
- One event per line
- The system will automatically extract these into the calendar

===========================================
YOUR TASK
===========================================

1. Analyze the captured content (including any images)
2. Determine the correct AREA and CATEGORY
3. Check if content should APPEND to an existing note or CREATE a new one
4. Format as proper markdown
5. If there's an image, describe what you see
6. If there are dates/events mentioned, include 📅 Event lines in the content!

Respond with JSON in this exact format:
{
  "action": "append" or "create",
  "existingNoteId": "ID from the notes above (only if action is append)",
  "area": "41",
  "jdId": "41.01",
  "title": "For new notes: the title. For append: the section header",
  "content": "The markdown content to add",
  "reasoning": "Why you chose this category and action"
}

REMEMBER: Use categories (41, 42, 71, 31) NOT area-level IDs (40.01, 70.01, 30.01)!`;

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
        model: "claude-sonnet-4-5-20250929", // Claude Sonnet 4.5
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
        
        const jdId = parsed.jdId || `${areaInfo.prefix}1.01`; // Default to X1.01, not X0.01
        suggestion = {
          action: parsed.action === "append" ? "append" : "create",
          existingNoteId: parsed.existingNoteId,
          area: parsed.area || "6",
          areaName: areaInfo.name,
          folder: getCategoryFolder(jdId),
          jdId: jdId,
          title: parsed.title || "Untitled Note",
          content: parsed.content || `# ${parsed.title}\n\n${captureContent}`,
          reasoning: parsed.reasoning || "AI suggestion",
        };
      } catch (parseError) {
        // Fallback to Ideas - create new (use 61 = Project Ideas category)
        suggestion = {
          action: "create",
          area: "61",
          areaName: "Ideas",
          folder: "61-projects",
          jdId: "61.01",
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
          // Full prompt and response for debugging
          fullSystemPrompt: systemPrompt,
          fullUserMessage: JSON.stringify(messageContent),
          fullClaudeResponse: responseText,
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

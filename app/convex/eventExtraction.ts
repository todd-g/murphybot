"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Event extraction regex - matches: 📅 Event: Title | YYYY-MM-DD | HH:MM | Location
const EVENT_REGEX = /📅\s*Event:\s*([^|]+)\s*\|\s*(\d{4}-\d{2}-\d{2})(?:\s*\|\s*(\d{1,2}:\d{2}))?(?:\s*\|\s*([^|\n]+))?/g;

// JD category detection based on note area
function detectJdCategory(jdId: string): string {
  const areaPrefix = jdId.charAt(0);
  const areaCategoryMap: Record<string, string> = {
    "5": "50.01", // Events area -> Local Events
    "2": "50.03", // Projects -> Appointments
    "3": "50.03", // People -> Appointments  
    "7": "50.01", // Home -> Local Events
    "8": "50.03", // Personal -> Appointments
  };
  return areaCategoryMap[areaPrefix] || "50.01";
}

interface ParsedEvent {
  title: string;
  startDate: string;
  allDay: boolean;
  location?: string;
  jdCategory: string;
  sourceNoteId: Id<"notes">;
  sourceText: string;
}

// Parse events from content
function parseEventsFromContent(
  content: string,
  noteId: Id<"notes">,
  jdId: string
): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  
  EVENT_REGEX.lastIndex = 0;
  
  let match;
  while ((match = EVENT_REGEX.exec(content)) !== null) {
    const [fullMatch, title, date, time, location] = match;
    
    let startDate = date;
    let allDay = true;
    if (time) {
      const [hours, minutes] = time.split(":");
      const paddedTime = `${hours.padStart(2, "0")}:${minutes}`;
      startDate = `${date}T${paddedTime}:00`;
      allDay = false;
    }
    
    events.push({
      title: title.trim(),
      startDate,
      allDay,
      location: location?.trim(),
      jdCategory: detectJdCategory(jdId),
      sourceNoteId: noteId,
      sourceText: fullMatch.trim(),
    });
  }
  
  return events;
}

// Main extraction action - scans all notes and syncs events
export const extractEventsFromAllNotes = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting event extraction from notes...");
    
    // Get all notes
    const notes = await ctx.runMutation(internal.events.getAllNotesForExtraction);
    console.log(`Scanning ${notes.length} notes for events`);
    
    let created = 0;
    let updated = 0;
    let removed = 0;
    let unchanged = 0;
    
    for (const note of notes) {
      // Parse events from this note
      const parsedEvents = parseEventsFromContent(note.content, note._id, note.jdId);
      
      if (parsedEvents.length > 0) {
        console.log(`Found ${parsedEvents.length} events in note: ${note.title}`);
      }
      
      // Upsert each parsed event
      const validSourceTexts: string[] = [];
      for (const event of parsedEvents) {
        validSourceTexts.push(event.sourceText);
        
        const result = await ctx.runMutation(internal.events.upsertExtractedEvent, {
          title: event.title,
          startDate: event.startDate,
          allDay: event.allDay,
          location: event.location,
          jdCategory: event.jdCategory,
          sourceNoteId: event.sourceNoteId,
          sourceText: event.sourceText,
        });
        
        if (result.action === "created") created++;
        else if (result.action === "updated") updated++;
        else unchanged++;
      }
      
      // Clean up any events that were removed from this note
      const cleanupResult = await ctx.runMutation(internal.events.cleanupOrphanedEvents, {
        noteId: note._id,
        validSourceTexts,
      });
      removed += cleanupResult.removed;
    }
    
    console.log(`Event extraction complete: ${created} created, ${updated} updated, ${removed} removed, ${unchanged} unchanged`);
    
    return { created, updated, removed, unchanged };
  },
});


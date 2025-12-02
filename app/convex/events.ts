import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Event extraction regex - matches: 📅 Event: Title | YYYY-MM-DD | HH:MM | Location
// Format: 📅 Event: Title | date | time (optional) | location (optional)
const EVENT_REGEX = /📅\s*Event:\s*([^|]+)\s*\|\s*(\d{4}-\d{2}-\d{2})(?:\s*\|\s*(\d{1,2}:\d{2}))?(?:\s*\|\s*([^|\n]+))?/g;

// JD category detection based on note area
function detectJdCategory(jdId: string): string {
  const areaPrefix = jdId.charAt(0);
  // Default categories by area
  const areaCategoryMap: Record<string, string> = {
    "5": "50.01", // Events area -> Local Events
    "2": "50.03", // Projects -> Appointments (meetings, deadlines)
    "3": "50.03", // People -> Appointments
    "7": "50.01", // Home -> Local Events
    "8": "50.03", // Personal -> Appointments
  };
  return areaCategoryMap[areaPrefix] || "50.01";
}

// Create a new event
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    allDay: v.boolean(),
    location: v.optional(v.string()),
    jdCategory: v.string(),
    noteId: v.optional(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("events", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  },
});

// Update an existing event
export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    allDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
    jdCategory: v.optional(v.string()),
    noteId: v.optional(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Event not found");
    }

    const cleanUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, cleanUpdates);
    return { id };
  },
});

// Delete an event
export const remove = mutation({
  args: {
    id: v.id("events"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { deleted: true };
  },
});

// Get all events
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("events").collect();
  },
});

// Get upcoming events (within next N days)
export const getUpcoming = query({
  args: {
    days: v.optional(v.number()), // Default 14 days
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 14;
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // "2025-12-02"
    
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);
    const future = futureDate.toISOString().split("T")[0];

    // Get all events and filter by date range
    const allEvents = await ctx.db.query("events").collect();
    
    const upcoming = allEvents.filter((event) => {
      const eventDate = event.startDate.split("T")[0]; // Handle both date and datetime
      return eventDate >= today && eventDate <= future;
    });

    // Sort by start date
    upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate));
    
    return upcoming;
  },
});

// Get events for a specific date range
export const getByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const allEvents = await ctx.db.query("events").collect();
    
    const filtered = allEvents.filter((event) => {
      const eventDate = event.startDate.split("T")[0];
      return eventDate >= args.startDate && eventDate <= args.endDate;
    });

    filtered.sort((a, b) => a.startDate.localeCompare(b.startDate));
    return filtered;
  },
});

// Get events by JD category
export const getByCategory = query({
  args: {
    jdCategory: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_jdCategory", (q) => q.eq("jdCategory", args.jdCategory))
      .collect();
  },
});

// Generate ICS format for events
export const getIcsData = query({
  args: {
    eventIds: v.optional(v.array(v.id("events"))), // If not provided, export all
  },
  handler: async (ctx, args) => {
    let events;
    if (args.eventIds && args.eventIds.length > 0) {
      events = await Promise.all(
        args.eventIds.map((id) => ctx.db.get(id))
      );
      events = events.filter(Boolean);
    } else {
      events = await ctx.db.query("events").collect();
    }

    // Build ICS content
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MurphyBot//Second Brain//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const event of events) {
      if (!event) continue;
      
      // Generate a unique ID
      const uid = `${event._id}@murphybot`;
      
      // Format dates for ICS
      // All-day events use DATE format (YYYYMMDD)
      // Timed events use DATETIME format (YYYYMMDDTHHMMSSZ)
      let dtstart: string;
      let dtend: string;
      
      if (event.allDay) {
        dtstart = `DTSTART;VALUE=DATE:${event.startDate.replace(/-/g, "")}`;
        if (event.endDate) {
          // ICS all-day events: end date is exclusive, add 1 day
          const end = new Date(event.endDate);
          end.setDate(end.getDate() + 1);
          dtend = `DTEND;VALUE=DATE:${end.toISOString().split("T")[0].replace(/-/g, "")}`;
        } else {
          // Single day event - end is next day
          const end = new Date(event.startDate);
          end.setDate(end.getDate() + 1);
          dtend = `DTEND;VALUE=DATE:${end.toISOString().split("T")[0].replace(/-/g, "")}`;
        }
      } else {
        // Timed event
        const startDt = new Date(event.startDate);
        dtstart = `DTSTART:${startDt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
        
        if (event.endDate) {
          const endDt = new Date(event.endDate);
          dtend = `DTEND:${endDt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
        } else {
          // Default 1 hour duration
          const endDt = new Date(startDt);
          endDt.setHours(endDt.getHours() + 1);
          dtend = `DTEND:${endDt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
        }
      }

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`);
      lines.push(dtstart);
      lines.push(dtend);
      lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
      
      if (event.description) {
        lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
      }
      if (event.location) {
        lines.push(`LOCATION:${escapeIcsText(event.location)}`);
      }
      
      // Add JD category as a category
      const categoryLabels: Record<string, string> = {
        "50.01": "Local Events",
        "50.02": "Travel",
        "50.03": "Appointments",
        "50.04": "Holidays",
      };
      lines.push(`CATEGORIES:${categoryLabels[event.jdCategory] || event.jdCategory}`);
      
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    
    return lines.join("\r\n");
  },
});

// Helper to escape special characters in ICS text
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// ============================================================
// EVENT EXTRACTION FROM NOTES
// ============================================================

// Parse events from a single note's content
function parseEventsFromContent(content: string, noteId: Id<"notes">, jdId: string): Array<{
  title: string;
  startDate: string;
  allDay: boolean;
  location?: string;
  jdCategory: string;
  sourceNoteId: Id<"notes">;
  sourceText: string;
}> {
  const events: Array<{
    title: string;
    startDate: string;
    allDay: boolean;
    location?: string;
    jdCategory: string;
    sourceNoteId: Id<"notes">;
    sourceText: string;
  }> = [];
  
  // Reset regex state
  EVENT_REGEX.lastIndex = 0;
  
  let match;
  while ((match = EVENT_REGEX.exec(content)) !== null) {
    const [fullMatch, title, date, time, location] = match;
    
    // Build start date - with time if provided
    let startDate = date;
    let allDay = true;
    if (time) {
      // Pad time if needed (e.g., "9:00" -> "09:00")
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

// Internal mutation to upsert an extracted event
export const upsertExtractedEvent = internalMutation({
  args: {
    title: v.string(),
    startDate: v.string(),
    allDay: v.boolean(),
    location: v.optional(v.string()),
    jdCategory: v.string(),
    sourceNoteId: v.id("notes"),
    sourceText: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if we already have this exact event (by source text + note)
    const existingEvents = await ctx.db
      .query("events")
      .withIndex("by_sourceNoteId", (q) => q.eq("sourceNoteId", args.sourceNoteId))
      .collect();
    
    const existing = existingEvents.find(e => e.sourceText === args.sourceText);
    
    if (existing) {
      // Update if anything changed
      if (
        existing.title !== args.title ||
        existing.startDate !== args.startDate ||
        existing.allDay !== args.allDay ||
        existing.location !== args.location ||
        existing.jdCategory !== args.jdCategory
      ) {
        await ctx.db.patch(existing._id, {
          title: args.title,
          startDate: args.startDate,
          allDay: args.allDay,
          location: args.location,
          jdCategory: args.jdCategory,
          updatedAt: Date.now(),
        });
        return { action: "updated", id: existing._id };
      }
      return { action: "unchanged", id: existing._id };
    }
    
    // Create new extracted event
    const now = Date.now();
    const id = await ctx.db.insert("events", {
      title: args.title,
      startDate: args.startDate,
      allDay: args.allDay,
      location: args.location,
      jdCategory: args.jdCategory,
      sourceNoteId: args.sourceNoteId,
      sourceText: args.sourceText,
      isExtracted: true,
      createdAt: now,
      updatedAt: now,
    });
    return { action: "created", id };
  },
});

// Internal mutation to remove orphaned extracted events (source text no longer in note)
export const cleanupOrphanedEvents = internalMutation({
  args: {
    noteId: v.id("notes"),
    validSourceTexts: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const extractedEvents = await ctx.db
      .query("events")
      .withIndex("by_sourceNoteId", (q) => q.eq("sourceNoteId", args.noteId))
      .filter((q) => q.eq(q.field("isExtracted"), true))
      .collect();
    
    let removed = 0;
    for (const event of extractedEvents) {
      if (event.sourceText && !args.validSourceTexts.includes(event.sourceText)) {
        await ctx.db.delete(event._id);
        removed++;
      }
    }
    return { removed };
  },
});

// Internal mutation to get all notes for extraction
export const getAllNotesForExtraction = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("notes").collect();
  },
});

// Export the parsing function for use in actions
export { parseEventsFromContent };

// Manual trigger for event extraction (calls the internal action via scheduler)
export const triggerExtraction = mutation({
  args: {},
  handler: async (ctx) => {
    // We can't call internal actions directly from mutations,
    // but we can use the scheduler to trigger it
    await ctx.scheduler.runAfter(0, internal.eventExtraction.extractEventsFromAllNotes);
    return { scheduled: true };
  },
});


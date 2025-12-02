import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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


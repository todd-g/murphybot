import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";

// Internal query to get oldest pending capture
export const getOldestPending = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("capture_queue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(1);
  },
});

// Internal mutation to update capture status
export const updateCaptureStatus = internalMutation({
  args: {
    id: v.id("capture_queue"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { 
      status: args.status, 
      synced: args.status === "done" 
    });
  },
});

// Internal mutation to create note
export const createNoteInternal = internalMutation({
  args: {
    jdId: v.string(),
    path: v.string(),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if note exists
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        title: args.title,
        content: args.content,
        updatedAt: Date.now(),
        version: (existing.version ?? 0) + 1,
      });
      return { id: existing._id, action: "updated" };
    }

    // Create new
    const id = await ctx.db.insert("notes", {
      jdId: args.jdId,
      path: args.path,
      title: args.title,
      content: args.content,
      updatedAt: Date.now(),
      version: 1,
    });
    return { id, action: "created" };
  },
});

// Internal mutation to log activity
export const logActivity = internalMutation({
  args: {
    action: v.string(),
    captureId: v.optional(v.id("capture_queue")),
    noteId: v.id("notes"),
    notePath: v.string(),
    noteTitle: v.string(),
    suggestedArea: v.string(),
    reasoning: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activity_log", {
      createdAt: Date.now(),
      action: args.action,
      captureId: args.captureId,
      noteId: args.noteId,
      notePath: args.notePath,
      noteTitle: args.noteTitle,
      suggestedArea: args.suggestedArea,
      reasoning: args.reasoning,
    });
  },
});


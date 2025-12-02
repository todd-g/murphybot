import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get recent activity (for activity page)
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("activity_log")
      .order("desc")
      .take(limit);
  },
});

// Log an activity (called by processing action)
export const log = mutation({
  args: {
    action: v.string(),
    captureId: v.optional(v.id("capture_queue")),
    noteId: v.optional(v.id("notes")), // Optional for skip actions
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


import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Upsert a note (used by MD → Convex sync script)
export const upsert = mutation({
  args: {
    jdId: v.string(),
    path: v.string(),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if note with this path already exists
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .first();

    if (existing) {
      // Update existing note
      await ctx.db.patch(existing._id, {
        jdId: args.jdId,
        title: args.title,
        content: args.content,
        updatedAt: Date.now(),
      });
      return { action: "updated", id: existing._id };
    } else {
      // Create new note
      const id = await ctx.db.insert("notes", {
        jdId: args.jdId,
        path: args.path,
        title: args.title,
        content: args.content,
        updatedAt: Date.now(),
      });
      return { action: "created", id };
    }
  },
});

// Delete a note by path (for when files are removed)
export const deleteByPath = mutation({
  args: {
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { deleted: true };
    }
    return { deleted: false };
  },
});

// Search notes by content (full-text search)
export const search = query({
  args: {
    query: v.string(),
    jdPrefix: v.optional(v.string()), // e.g., "30" to search only People
  },
  handler: async (ctx, args) => {
    let searchQuery = ctx.db
      .query("notes")
      .withSearchIndex("search_content", (q) => {
        let search = q.search("content", args.query);
        if (args.jdPrefix) {
          // Filter by JD area prefix
          search = search.eq("jdId", args.jdPrefix);
        }
        return search;
      });

    const results = await searchQuery.take(10);
    return results;
  },
});

// Get all notes (for sync verification or full export)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("notes").collect();
  },
});

// Get notes by JD area (e.g., all notes in 30-39 People area)
export const getByArea = query({
  args: {
    areaPrefix: v.string(), // e.g., "3" for 30-39
  },
  handler: async (ctx, args) => {
    const allNotes = await ctx.db.query("notes").collect();
    // Filter by area prefix (first digit of jdId)
    return allNotes.filter((note) => note.jdId.startsWith(args.areaPrefix));
  },
});

// Get a single note by path
export const getByPath = query({
  args: {
    path: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .first();
  },
});


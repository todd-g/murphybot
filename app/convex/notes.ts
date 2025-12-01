import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new note directly in the app
export const create = mutation({
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
      throw new Error(`Note already exists at path: ${args.path}`);
    }

    const id = await ctx.db.insert("notes", {
      jdId: args.jdId,
      path: args.path,
      title: args.title,
      content: args.content,
      updatedAt: Date.now(),
      version: 1,
    });
    return { id, version: 1 };
  },
});

// Update an existing note (increments version)
export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    jdId: v.optional(v.string()),
    path: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Note not found");
    }

    const newVersion = (existing.version ?? 0) + 1;
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
      version: newVersion,
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.jdId !== undefined) updates.jdId = args.jdId;
    if (args.path !== undefined) updates.path = args.path;

    await ctx.db.patch(args.id, updates);
    return { id: args.id, version: newVersion };
  },
});

// Delete a note by ID
export const remove = mutation({
  args: {
    id: v.id("notes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { deleted: true };
  },
});

// Upsert a note (used by sync scripts - handles version tracking)
export const upsert = mutation({
  args: {
    jdId: v.string(),
    path: v.string(),
    title: v.string(),
    content: v.string(),
    expectedVersion: v.optional(v.number()), // For conflict detection
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .first();

    if (existing) {
      // Check for conflicts if expectedVersion provided
      if (args.expectedVersion !== undefined && existing.version !== args.expectedVersion) {
        return {
          action: "conflict",
          id: existing._id,
          currentVersion: existing.version,
          expectedVersion: args.expectedVersion,
        };
      }

      const newVersion = (existing.version ?? 0) + 1;
      await ctx.db.patch(existing._id, {
        jdId: args.jdId,
        title: args.title,
        content: args.content,
        updatedAt: Date.now(),
        version: newVersion,
      });
      return { action: "updated", id: existing._id, version: newVersion };
    } else {
      const id = await ctx.db.insert("notes", {
        jdId: args.jdId,
        path: args.path,
        title: args.title,
        content: args.content,
        updatedAt: Date.now(),
        version: 1,
      });
      return { action: "created", id, version: 1 };
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

// Get all notes with version info (for sync scripts)
export const getForSync = query({
  args: {},
  handler: async (ctx) => {
    const notes = await ctx.db.query("notes").collect();
    return notes.map((note) => ({
      _id: note._id,
      path: note.path,
      jdId: note.jdId,
      title: note.title,
      content: note.content,
      updatedAt: note.updatedAt,
      version: note.version ?? 1,
    }));
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



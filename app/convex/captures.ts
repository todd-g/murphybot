import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new capture in the queue
export const create = mutation({
  args: {
    source: v.string(),
    contentType: v.string(),
    text: v.optional(v.string()),
    fileStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const captureId = await ctx.db.insert("capture_queue", {
      createdAt: Date.now(),
      source: args.source,
      contentType: args.contentType,
      text: args.text,
      fileStorageId: args.fileStorageId,
      synced: false,
      status: "pending",
    });
    return captureId;
  },
});

// Get all unsynced captures (for local sync script)
export const getUnsynced = query({
  args: {},
  handler: async (ctx) => {
    const captures = await ctx.db
      .query("capture_queue")
      .withIndex("by_synced", (q) => q.eq("synced", false))
      .collect();

    // For any captures with file storage, get the URL
    const capturesWithUrls = await Promise.all(
      captures.map(async (capture) => {
        let fileUrl: string | null = null;
        if (capture.fileStorageId) {
          fileUrl = await ctx.storage.getUrl(capture.fileStorageId);
        }
        return {
          ...capture,
          fileUrl,
        };
      })
    );

    return capturesWithUrls;
  },
});

// Mark captures as synced (called by local sync script)
export const markSynced = mutation({
  args: {
    ids: v.array(v.id("capture_queue")),
  },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.patch(id, { synced: true });
    }
    return { success: true, count: args.ids.length };
  },
});

// Get recent captures (for viewing in the web app)
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const captures = await ctx.db
      .query("capture_queue")
      .order("desc")
      .take(limit);
    return captures;
  },
});

// Generate upload URL for file uploads
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get pending captures (for in-app inbox processing)
export const getPending = query({
  args: {},
  handler: async (ctx) => {
    const captures = await ctx.db
      .query("capture_queue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // For any captures with file storage, get the URL
    const capturesWithUrls = await Promise.all(
      captures.map(async (capture) => {
        let fileUrl: string | null = null;
        if (capture.fileStorageId) {
          fileUrl = await ctx.storage.getUrl(capture.fileStorageId);
        }
        return {
          ...capture,
          fileUrl,
        };
      })
    );

    return capturesWithUrls;
  },
});

// Get a single capture by ID
export const get = query({
  args: {
    id: v.id("capture_queue"),
  },
  handler: async (ctx, args) => {
    const capture = await ctx.db.get(args.id);
    if (!capture) return null;

    let fileUrl: string | null = null;
    if (capture.fileStorageId) {
      fileUrl = await ctx.storage.getUrl(capture.fileStorageId);
    }
    return { ...capture, fileUrl };
  },
});

// Update capture status
export const updateStatus = mutation({
  args: {
    id: v.id("capture_queue"),
    status: v.string(), // "pending" | "processing" | "done"
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
    return { success: true };
  },
});

// Mark capture as done (after processing into a note)
export const markDone = mutation({
  args: {
    id: v.id("capture_queue"),
    noteId: v.optional(v.id("notes")), // Link to created note
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "done",
      synced: true,
    });
    return { success: true };
  },
});



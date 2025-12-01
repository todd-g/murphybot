import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Raw captures from web form - awaiting processing
  capture_queue: defineTable({
    createdAt: v.number(),
    source: v.string(), // "web" | "ios-shortcut" | "email"
    contentType: v.string(), // "text" | "image" | "url" | "file"
    text: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    fileStorageId: v.optional(v.id("_storage")),
    synced: v.boolean(), // Has local script pulled this? (legacy)
    status: v.optional(v.string()), // "pending" | "processing" | "done"
  })
    .index("by_synced", ["synced"])
    .index("by_status", ["status"]),

  // Notes - source of truth is now the app
  notes: defineTable({
    jdId: v.string(), // "50.01"
    path: v.string(), // "50-events/50.01-local-events.md"
    title: v.string(),
    content: v.string(), // Full markdown content
    updatedAt: v.number(),
    version: v.number(), // Increment on each edit for sync conflict detection
  })
    .index("by_jdId", ["jdId"])
    .index("by_path", ["path"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["jdId"],
    }),
});



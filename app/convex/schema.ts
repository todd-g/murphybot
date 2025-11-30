import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Raw captures from web form - awaiting local processing
  capture_queue: defineTable({
    createdAt: v.number(),
    source: v.string(), // "web" | "ios-shortcut" | "email"
    contentType: v.string(), // "text" | "image" | "url" | "file"
    text: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    fileStorageId: v.optional(v.id("_storage")),
    synced: v.boolean(), // Has local script pulled this?
  }).index("by_synced", ["synced"]),

  // Notes synced from markdown files in the repo
  notes: defineTable({
    jdId: v.string(), // "50.01"
    path: v.string(), // "50-events/50.01-local-events.md"
    title: v.string(),
    content: v.string(), // Full markdown content
    updatedAt: v.number(),
  })
    .index("by_jdId", ["jdId"])
    .index("by_path", ["path"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["jdId"],
    }),
});


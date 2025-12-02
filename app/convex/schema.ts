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
    version: v.optional(v.number()), // Increment on each edit for sync conflict detection
  })
    .index("by_jdId", ["jdId"])
    .index("by_path", ["path"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["jdId"],
    }),

  // Events - calendar items with proper date handling
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.string(), // ISO date: "2025-12-25" or datetime: "2025-12-25T14:00:00"
    endDate: v.optional(v.string()), // Optional end date/time
    allDay: v.boolean(),
    location: v.optional(v.string()),
    jdCategory: v.string(), // "50.01" local, "50.02" travel, "50.03" appointments, "50.04" holidays
    noteId: v.optional(v.id("notes")), // Link to related note if exists
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_startDate", ["startDate"])
    .index("by_jdCategory", ["jdCategory"]),

  // Activity log - tracks AI auto-processing actions
  activity_log: defineTable({
    createdAt: v.number(),
    action: v.string(), // "created" | "updated" | "appended"
    captureId: v.optional(v.id("capture_queue")),
    noteId: v.id("notes"),
    notePath: v.string(),
    noteTitle: v.string(),
    suggestedArea: v.string(), // e.g. "Ideas", "Media"
    reasoning: v.string(), // AI's explanation
    // Debug info
    debug: v.optional(v.object({
      notesInContext: v.number(),
      imageAttached: v.boolean(),
      systemPromptLength: v.number(),
      captureText: v.optional(v.string()),
      captureHadImage: v.boolean(),
      imageUrl: v.optional(v.string()),
      // Full prompt and response for debugging
      fullSystemPrompt: v.optional(v.string()),
      fullUserMessage: v.optional(v.string()),
      fullClaudeResponse: v.optional(v.string()),
    })),
  }).index("by_createdAt", ["createdAt"]),
});



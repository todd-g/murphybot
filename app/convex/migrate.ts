import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";

// Migration: Update notes from old JD structure (X0.YY) to new (XY.ZZ)
// Key: old jdId, Value: new jdId and path
const MIGRATIONS: Record<string, { newJdId: string; newPath: string }> = {
  // Family Information: 30.01 -> 31.01
  "30.01": {
    newJdId: "31.01",
    newPath: "31-family/31.01-family-information.md",
  },
  // School Contacts: 30.05 -> 31.02
  "30.05": {
    newJdId: "31.02",
    newPath: "31-family/31.02-school-contacts.md",
  },
  // Horror Movies: 40.01 -> 41.01
  "40.01": {
    newJdId: "41.01",
    newPath: "41-movies/41.01-horror-movies.md",
  },
  // Movies & TV: 40.03 -> 41.02
  "40.03": {
    newJdId: "41.02",
    newPath: "41-movies/41.02-movies-to-watch.md",
  },
  // Games: 40.06 -> 46.01
  "40.06": {
    newJdId: "46.01",
    newPath: "46-games/46.01-games-to-play.md",
  },
  // WAJ Youth Basketball: 50.05 -> 51.01
  "50.05": {
    newJdId: "51.01",
    newPath: "51-local/51.01-waj-wee-warriors-basketball.md",
  },
  // Best birthday gift: 80.05 -> 84.01 (finances/gifts)
  "80.05": {
    newJdId: "84.01",
    newPath: "84-finances/84.01-gift-ideas.md",
  },
};

// Run all migrations - finds notes by old jdId and updates them
export const migrateAll = mutation({
  args: {},
  handler: async (ctx) => {
    const results: Array<{ oldJdId: string; result: any }> = [];

    // Get all notes
    const allNotes = await ctx.db.query("notes").collect();

    for (const [oldJdId, migration] of Object.entries(MIGRATIONS)) {
      // Find note with this old jdId
      const note = allNotes.find((n) => n.jdId === oldJdId);
      
      if (!note) {
        results.push({ oldJdId, result: { success: false, message: "Not found" } });
        continue;
      }

      await ctx.db.patch(note._id, {
        jdId: migration.newJdId,
        path: migration.newPath,
        version: (note.version ?? 0) + 1,
        updatedAt: Date.now(),
      });

      results.push({
        oldJdId,
        result: {
          success: true,
          title: note.title,
          oldJdId: note.jdId,
          newJdId: migration.newJdId,
          oldPath: note.path,
          newPath: migration.newPath,
        },
      });
    }

    return results;
  },
});

// Update area index notes with proper category listings
export const updateIndexNotes = mutation({
  args: {},
  handler: async (ctx) => {
    const indexUpdates: Record<string, string> = {
      "30.00": `# People

This area contains notes about people in your life.

## Categories

- **31** - Family
- **32** - Friends
- **33** - Professional Contacts
- **34** - Service Providers

## Notes

See individual category folders for notes.`,

      "40.00": `# Media

This area tracks books, movies, TV shows, podcasts, and other media.

## Categories

- **41** - Movies
- **42** - TV Shows
- **43** - Books
- **44** - Podcasts
- **45** - Music
- **46** - Games

## Notes

See individual category folders for notes.`,

      "50.00": `# Events

This area tracks events, appointments, and calendar items.

## Categories

- **51** - Local Events
- **52** - Travel & Trips
- **53** - Appointments
- **54** - Holidays & Celebrations

## Upcoming

See individual category folders for notes.`,

      "60.00": `# Ideas & Brainstorms

This area captures ideas, brainstorms, and creative thoughts.

## Categories

- **61** - Project Ideas
- **62** - Business Ideas
- **63** - Creative Writing
- **64** - Random Thoughts

## Notes

See individual category folders for notes.`,

      "70.00": `# Home & Household

This area contains notes about home maintenance, purchases, and household management.

## Categories

- **71** - Pets
- **72** - Vehicles
- **73** - Maintenance & Repairs
- **74** - Purchases & Warranties
- **75** - Utilities & Services

## Notes

See individual category folders for notes.`,

      "80.00": `# Personal

This area contains personal notes, journal entries, and reflections.

## Categories

- **81** - Journal
- **82** - Goals & Resolutions
- **83** - Health & Wellness
- **84** - Finances

## Notes

See individual category folders for notes.`,
    };

    const results: Array<{ jdId: string; result: any }> = [];
    const allNotes = await ctx.db.query("notes").collect();

    for (const [jdId, newContent] of Object.entries(indexUpdates)) {
      const note = allNotes.find((n) => n.jdId === jdId);
      
      if (!note) {
        results.push({ jdId, result: { success: false, message: "Not found" } });
        continue;
      }

      await ctx.db.patch(note._id, {
        content: newContent,
        version: (note.version ?? 0) + 1,
        updatedAt: Date.now(),
      });

      results.push({
        jdId,
        result: {
          success: true,
          title: note.title,
        },
      });
    }

    return results;
  },
});

// Delete test notes that were created during debugging
export const cleanupTestNotes = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all notes with test-related titles
    const allNotes = await ctx.db.query("notes").collect();
    const testNotes = allNotes.filter(
      (n) =>
        n.title.toLowerCase().includes("test") ||
        n.title.toLowerCase().includes("debug") ||
        n.jdId.startsWith("00.") && n.jdId !== "00.00" // Keep only the main index
    );

    const deleted: string[] = [];
    for (const note of testNotes) {
      await ctx.db.delete(note._id);
      deleted.push(`${note.jdId}: ${note.title}`);
    }

    return { deleted, count: deleted.length };
  },
});


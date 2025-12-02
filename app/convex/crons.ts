import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process pending captures every 5 minutes
crons.interval(
  "process pending captures",
  { minutes: 5 },
  internal.processing.processNextCapture
);

// Extract events from notes every 5 minutes
crons.interval(
  "extract events from notes",
  { minutes: 5 },
  internal.eventExtraction.extractEventsFromAllNotes
);

export default crons;


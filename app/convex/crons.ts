import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process pending captures every 5 minutes
crons.interval(
  "process pending captures",
  { minutes: 5 },
  internal.processing.processNextCapture
);

// Extract events from notes hourly
crons.interval(
  "extract events from notes",
  { hours: 1 },
  internal.eventExtraction.extractEventsFromAllNotes
);

export default crons;


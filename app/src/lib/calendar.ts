// Calendar link generation utility
// Supports multiple calendar providers with an extensible architecture

export type CalendarEvent = {
  title: string;
  description?: string;
  startDate: string; // ISO format or YYYY-MM-DD
  endDate?: string;  // ISO format or YYYY-MM-DD
  allDay: boolean;
  location?: string;
};

export type CalendarProvider = {
  id: string;
  name: string;
  icon?: string; // Optional icon identifier
  generateUrl: (event: CalendarEvent) => string;
};

// Helper to format date for Google Calendar
// All-day events: YYYYMMDD
// Timed events: YYYYMMDDTHHmmssZ (UTC)
function formatGoogleDate(dateStr: string, allDay: boolean): string {
  if (allDay) {
    // For all-day events, just use YYYYMMDD
    return dateStr.split("T")[0].replace(/-/g, "");
  }
  
  // For timed events, convert to UTC format
  const date = new Date(dateStr);
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Helper to get end date for all-day events (Google needs next day)
function getNextDay(dateStr: string): string {
  const date = new Date(dateStr.split("T")[0]);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0].replace(/-/g, "");
}

// Helper to format date for Outlook/Office 365
function formatOutlookDate(dateStr: string, allDay: boolean): string {
  if (allDay) {
    return dateStr.split("T")[0];
  }
  // Outlook wants ISO format
  return new Date(dateStr).toISOString();
}

// Helper to format date for ICS/Apple Calendar
function formatIcsDate(dateStr: string, allDay: boolean): string {
  if (allDay) {
    return dateStr.split("T")[0].replace(/-/g, "");
  }
  const date = new Date(dateStr);
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Calendar providers configuration
export const calendarProviders: CalendarProvider[] = [
  {
    id: "google",
    name: "Google Calendar",
    generateUrl: (event: CalendarEvent) => {
      const params = new URLSearchParams();
      params.set("action", "TEMPLATE");
      params.set("text", event.title);
      
      // Format dates
      const start = formatGoogleDate(event.startDate, event.allDay);
      let end: string;
      
      if (event.endDate) {
        end = event.allDay 
          ? getNextDay(event.endDate) 
          : formatGoogleDate(event.endDate, false);
      } else {
        // Default end: next day for all-day, +1 hour for timed
        if (event.allDay) {
          end = getNextDay(event.startDate);
        } else {
          const endDate = new Date(event.startDate);
          endDate.setHours(endDate.getHours() + 1);
          end = formatGoogleDate(endDate.toISOString(), false);
        }
      }
      
      params.set("dates", `${start}/${end}`);
      
      if (event.description) {
        params.set("details", event.description);
      }
      
      if (event.location) {
        params.set("location", event.location);
      }
      
      return `https://calendar.google.com/calendar/render?${params.toString()}`;
    },
  },
  {
    id: "outlook",
    name: "Outlook",
    generateUrl: (event: CalendarEvent) => {
      const params = new URLSearchParams();
      params.set("path", "/calendar/action/compose");
      params.set("rru", "addevent");
      params.set("subject", event.title);
      
      params.set("startdt", formatOutlookDate(event.startDate, event.allDay));
      
      if (event.endDate) {
        params.set("enddt", formatOutlookDate(event.endDate, event.allDay));
      } else {
        // Default end
        if (event.allDay) {
          params.set("enddt", formatOutlookDate(event.startDate, true));
        } else {
          const endDate = new Date(event.startDate);
          endDate.setHours(endDate.getHours() + 1);
          params.set("enddt", formatOutlookDate(endDate.toISOString(), false));
        }
      }
      
      if (event.allDay) {
        params.set("allday", "true");
      }
      
      if (event.description) {
        params.set("body", event.description);
      }
      
      if (event.location) {
        params.set("location", event.location);
      }
      
      return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
    },
  },
  {
    id: "yahoo",
    name: "Yahoo Calendar",
    generateUrl: (event: CalendarEvent) => {
      const params = new URLSearchParams();
      params.set("v", "60");
      params.set("title", event.title);
      
      // Yahoo uses different format: YYYYMMDD for all-day, YYYYMMDDTHHmmss for timed
      const start = formatGoogleDate(event.startDate, event.allDay);
      params.set("st", start);
      
      if (event.endDate) {
        params.set("et", formatGoogleDate(event.endDate, event.allDay));
      } else {
        if (!event.allDay) {
          const endDate = new Date(event.startDate);
          endDate.setHours(endDate.getHours() + 1);
          params.set("dur", "0100"); // 1 hour duration
        }
      }
      
      if (event.description) {
        params.set("desc", event.description);
      }
      
      if (event.location) {
        params.set("in_loc", event.location);
      }
      
      return `https://calendar.yahoo.com/?${params.toString()}`;
    },
  },
];

// Get a specific provider by ID
export function getCalendarProvider(id: string): CalendarProvider | undefined {
  return calendarProviders.find((p) => p.id === id);
}

// Generate calendar URL for a specific provider
export function generateCalendarUrl(
  providerId: string,
  event: CalendarEvent
): string | null {
  const provider = getCalendarProvider(providerId);
  if (!provider) return null;
  return provider.generateUrl(event);
}

// Generate all calendar URLs for an event
export function generateAllCalendarUrls(
  event: CalendarEvent
): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const provider of calendarProviders) {
    urls[provider.id] = provider.generateUrl(event);
  }
  return urls;
}


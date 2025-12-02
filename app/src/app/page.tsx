"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { FolderOpen, Zap, Search, Sparkles, Clock, FileText, Calendar, MapPin, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Helper to format relative dates
function formatRelativeDate(dateStr: string): string {
  const eventDate = new Date(dateStr.split("T")[0] + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 14) return "Next week";
  return eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Helper to format time from datetime string
function formatTime(dateStr: string): string | null {
  if (!dateStr.includes("T")) return null;
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Category labels and colors
const categoryConfig: Record<string, { label: string; color: string }> = {
  "50.01": { label: "Local", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  "50.02": { label: "Travel", color: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
  "50.03": { label: "Appt", color: "bg-amber-500/20 text-amber-700 dark:text-amber-400" },
  "50.04": { label: "Holiday", color: "bg-rose-500/20 text-rose-700 dark:text-rose-400" },
};

export default function Home() {
  const notes = useQuery(api.notes.getAll);
  const pendingCaptures = useQuery(api.captures.getPending);
  const upcomingEvents = useQuery(api.events.getUpcoming, { days: 14 });
  
  const noteCount = notes?.length ?? 0;
  const pendingCount = pendingCaptures?.length ?? 0;
  const eventCount = upcomingEvents?.length ?? 0;

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="MurphyBot"
            width={64}
            height={64}
            className="rounded-xl"
          />
          <div>
            <h1 className="text-2xl font-bold">Welcome to MurphyBot</h1>
            <p className="text-muted-foreground">
              Your app-first, AI-assisted second brain
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Notes</CardDescription>
              <CardTitle className="text-3xl">{noteCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/browse" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                Browse all
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Captures</CardDescription>
              <CardTitle className="text-3xl">{pendingCount}</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingCount > 0 ? (
                <span className="text-sm text-muted-foreground">
                  Auto-processing every 5 min
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  All caught up!
                </span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Upcoming Events</CardDescription>
              <CardTitle className="text-3xl">{eventCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/events" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Manage events
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Quick Actions</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href="/capture" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Capture
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/search" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <Search className="h-3 w-3" />
                Search
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="group hover:border-primary/50 transition-colors">
            <Link href="/capture">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/50">
                    <Zap className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      Quick Capture
                    </CardTitle>
                    <CardDescription>
                      Dump it, AI sorts it automatically
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="group hover:border-primary/50 transition-colors">
            <Link href="/ask">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/50">
                    <Sparkles className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      Ask AI
                    </CardTitle>
                    <CardDescription>
                      Natural language queries
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Upcoming Events</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href="/api/events?format=ics" 
                  className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                  title="Export to calendar"
                >
                  <Download className="h-3 w-3" />
                  ICS
                </a>
                <Link href="/events" className="text-sm text-primary hover:underline">
                  View all
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingEvents === undefined ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mb-3">No upcoming events</p>
                <Link href="/events">
                  <Button variant="outline" size="sm">
                    <Calendar className="h-3 w-3 mr-1" />
                    Add an event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map((event) => {
                  const relDate = formatRelativeDate(event.startDate);
                  const time = event.allDay ? null : formatTime(event.startDate);
                  const cat = categoryConfig[event.jdCategory] || { label: "Event", color: "bg-gray-500/20 text-gray-600" };
                  const isToday = relDate === "Today";
                  
                  return (
                    <div 
                      key={event._id} 
                      className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                        isToday ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className={`flex flex-col items-center justify-center min-w-[48px] py-1 px-2 rounded ${
                        isToday ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        <span className="text-xs font-medium">
                          {new Date(event.startDate.split("T")[0] + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {new Date(event.startDate.split("T")[0] + "T00:00:00").getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{event.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.color}`}>
                            {cat.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className={isToday ? "text-primary font-medium" : ""}>{relDate}</span>
                          {time && (
                            <>
                              <span>·</span>
                              <span>{time}</span>
                            </>
                          )}
                          {event.location && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5 truncate">
                                <MapPin className="h-2.5 w-2.5" />
                                {event.location}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {upcomingEvents.length > 5 && (
                  <Link 
                    href="/events" 
                    className="block text-center text-sm text-muted-foreground hover:text-primary py-2"
                  >
                    +{upcomingEvents.length - 5} more events →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Teaser */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </div>
              <Link href="/activity" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              AI activity log will appear here as captures are automatically processed.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

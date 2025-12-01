"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { Clock, FileText, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// JD area colors for visual distinction
const AREA_COLORS: Record<string, string> = {
  "Index": "bg-slate-500/20 text-slate-300",
  "Reference": "bg-blue-500/20 text-blue-300",
  "Projects": "bg-green-500/20 text-green-300",
  "People": "bg-yellow-500/20 text-yellow-300",
  "Media": "bg-purple-500/20 text-purple-300",
  "Events": "bg-pink-500/20 text-pink-300",
  "Ideas": "bg-orange-500/20 text-orange-300",
  "Home": "bg-teal-500/20 text-teal-300",
  "Personal": "bg-indigo-500/20 text-indigo-300",
  "Archive": "bg-gray-500/20 text-gray-300",
};

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

export default function ActivityPage() {
  const activities = useQuery(api.activity.getRecent, { limit: 50 });

  return (
    <main className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Activity</h1>
            <p className="text-muted-foreground">
              AI auto-processing log
            </p>
          </div>
        </div>

        {/* Activity List */}
        <div className="space-y-3">
          {activities === undefined ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading activity...
              </CardContent>
            </Card>
          ) : activities.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No activity yet</p>
                <p className="text-sm text-muted-foreground">
                  Captures are auto-processed every 5 minutes.
                  <br />
                  <Link href="/capture" className="text-primary hover:underline">
                    Capture something
                  </Link>
                  {" "}to see the AI in action.
                </p>
              </CardContent>
            </Card>
          ) : (
            activities.map((activity) => (
              <Card key={activity._id} className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">
                        {activity.action === "created" ? "Created" : "Updated"} note
                      </CardTitle>
                      <span className={`text-xs px-2 py-0.5 rounded ${AREA_COLORS[activity.suggestedArea] || "bg-muted text-muted-foreground"}`}>
                        {activity.suggestedArea}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(activity.createdAt)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link 
                    href={`/note/${activity.notePath}`}
                    className="flex items-center gap-2 group"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {activity.noteTitle}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
                  </Link>
                  
                  <p className="text-sm text-muted-foreground italic">
                    &ldquo;{activity.reasoning}&rdquo;
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}


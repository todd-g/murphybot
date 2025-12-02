"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { Clock, FileText, Sparkles, ArrowRight, Loader2, Inbox } from "lucide-react";
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
  const pendingCaptures = useQuery(api.captures.getPending);

  const pendingCount = pendingCaptures?.length ?? 0;

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
              Captures and AI processing log
            </p>
          </div>
        </div>

        {/* Pending Captures Section */}
        {pendingCaptures === undefined ? (
          <Card>
            <CardContent className="py-4 text-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            </CardContent>
          </Card>
        ) : pendingCount > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Inbox className="h-4 w-4" />
              <span>{pendingCount} pending capture{pendingCount !== 1 ? "s" : ""}</span>
              <span className="text-xs">· Auto-processing every 5 min</span>
            </div>
            {pendingCaptures.map((capture) => (
              <Card key={capture._id} className="border-dashed border-primary/30 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-primary/10">
                      <Loader2 className="h-3 w-3 text-primary animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span className="capitalize">{capture.source}</span>
                        <span>·</span>
                        <span>{capture.contentType}</span>
                        <span>·</span>
                        <span>{formatTimeAgo(capture.createdAt)}</span>
                      </div>
                      {capture.text && (
                        <p className="text-sm line-clamp-2 mb-2">
                          {capture.text}
                        </p>
                      )}
                      {/* Show image preview if available */}
                      {capture.fileUrl && (
                        <div className="mt-2">
                          <img 
                            src={capture.fileUrl} 
                            alt="Captured image" 
                            className="max-h-40 rounded border border-border"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Image URL: {capture.fileUrl.slice(0, 50)}...
                          </p>
                        </div>
                      )}
                      {!capture.text && !capture.fileUrl && (
                        <p className="text-sm text-muted-foreground">
                          [No content]
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Processed Activity List */}
        <div className="space-y-3">
          {pendingCount > 0 && activities && activities.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
              <Sparkles className="h-4 w-4" />
              <span>Recently processed</span>
            </div>
          )}
          
          {activities === undefined ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading activity...
              </CardContent>
            </Card>
          ) : activities.length === 0 && pendingCount === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No activity yet</p>
                <p className="text-sm text-muted-foreground">
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

                  {/* Debug info */}
                  {activity.debug && (
                    <details className="text-xs border border-border/50 rounded p-2 bg-muted/30">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Debug Info
                      </summary>
                      <div className="mt-2 space-y-1 font-mono">
                        <p>📝 Notes in context: <span className="text-primary">{activity.debug.notesInContext}</span></p>
                        <p>🖼️ Image attached to prompt: <span className={activity.debug.imageAttached ? "text-green-400" : "text-red-400"}>{activity.debug.imageAttached ? "YES" : "NO"}</span></p>
                        <p>📷 Capture had image: <span className={activity.debug.captureHadImage ? "text-green-400" : "text-muted-foreground"}>{activity.debug.captureHadImage ? "YES" : "NO"}</span></p>
                        <p>📏 System prompt: <span className="text-primary">{activity.debug.systemPromptLength?.toLocaleString()} chars</span></p>
                        {activity.debug.captureText && (
                          <p>💬 Capture text: <span className="text-muted-foreground">{activity.debug.captureText}</span></p>
                        )}
                        {activity.debug.imageUrl && (
                          <div className="mt-2">
                            <p>🔗 Image URL: <span className="text-muted-foreground break-all">{activity.debug.imageUrl.slice(0, 60)}...</span></p>
                            <img src={activity.debug.imageUrl} alt="Captured" className="mt-1 max-h-32 rounded border" />
                          </div>
                        )}
                        
                        {/* Full System Prompt */}
                        {activity.debug.fullSystemPrompt && (
                          <details className="mt-3 border border-border/30 rounded p-2">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              📋 Full System Prompt ({activity.debug.fullSystemPrompt.length.toLocaleString()} chars)
                            </summary>
                            <pre className="mt-2 text-xs whitespace-pre-wrap break-words max-h-96 overflow-auto bg-background/50 p-2 rounded">
                              {activity.debug.fullSystemPrompt}
                            </pre>
                          </details>
                        )}
                        
                        {/* Full User Message */}
                        {activity.debug.fullUserMessage && (
                          <details className="mt-2 border border-border/30 rounded p-2">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              💬 Full User Message
                            </summary>
                            <pre className="mt-2 text-xs whitespace-pre-wrap break-words max-h-48 overflow-auto bg-background/50 p-2 rounded">
                              {activity.debug.fullUserMessage}
                            </pre>
                          </details>
                        )}
                        
                        {/* Full Claude Response */}
                        {activity.debug.fullClaudeResponse && (
                          <details className="mt-2 border border-border/30 rounded p-2">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              🤖 Full Claude Response
                            </summary>
                            <pre className="mt-2 text-xs whitespace-pre-wrap break-words max-h-48 overflow-auto bg-background/50 p-2 rounded">
                              {activity.debug.fullClaudeResponse}
                            </pre>
                          </details>
                        )}
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

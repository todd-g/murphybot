"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { FolderOpen, Zap, Search, Sparkles, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const notes = useQuery(api.notes.getAll);
  const pendingCaptures = useQuery(api.captures.getPending);
  
  const noteCount = notes?.length ?? 0;
  const pendingCount = pendingCaptures?.length ?? 0;

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <CardDescription>Quick Actions</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
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

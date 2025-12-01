"use client";

import Link from "next/link";
import Image from "next/image";
import { Inbox, Sparkles, FolderOpen, Search, Zap } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex flex-col items-center justify-center gap-2">
            <Image
              src="/logo.png"
              alt="MurphyBot"
              width={180}
              height={180}
              priority
            />
          </div>
          <p className="text-muted-foreground text-lg">
            Your app-first, AI-assisted second brain
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Add Notes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/browse" className="block group">
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FolderOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        Browse & Edit
                      </CardTitle>
                      <CardDescription>
                        Direct access to notes
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/capture" className="block group">
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/50">
                      <Zap className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        Quick Capture
                      </CardTitle>
                      <CardDescription>
                        Dump it, AI sorts it
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* Retrieval Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Find Notes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/search" className="block group">
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Search className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        Search
                      </CardTitle>
                      <CardDescription>
                        Find by keyword
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/ask" className="block group">
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/50">
                      <Sparkles className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        Ask AI
                      </CardTitle>
                      <CardDescription>
                        Natural language query
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* Inbox link */}
        <div className="text-center">
          <Link 
            href="/inbox" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Inbox className="w-4 h-4" />
            Process captured items
          </Link>
        </div>
      </div>
    </main>
  );
}

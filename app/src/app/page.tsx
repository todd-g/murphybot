"use client";

import Link from "next/link";
import Image from "next/image";
import { Inbox, Sparkles, FolderOpen } from "lucide-react";
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
            Your local-first, AI-assisted second brain
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/capture" className="block group">
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Inbox className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      Capture
                    </CardTitle>
                    <CardDescription>
                      Quick capture thoughts
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/browse" className="block group">
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FolderOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      Browse
                    </CardTitle>
                    <CardDescription>
                      Explore your notes
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
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      Ask
                    </CardTitle>
                    <CardDescription>
                      Query with AI
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}

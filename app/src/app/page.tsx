"use client";

import Link from "next/link";
import { Brain, Inbox, Sparkles } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 opacity-0 animate-fade-in">
          <div className="flex items-center justify-center gap-3">
            <Brain className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">MurphyBot</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Your local-first, AI-assisted second brain
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-4 sm:grid-cols-2 opacity-0 animate-fade-in stagger-1">
          <Link href="/capture" className="block group">
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
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
                      Quick capture text, images, or links
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/ask" className="block group">
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      Ask My Brain
                    </CardTitle>
                    <CardDescription>
                      Query your knowledge with AI
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground opacity-0 animate-fade-in stagger-2">
          <p>
            Powered by{" "}
            <span className="text-foreground">Johnny.Decimal</span> organization
          </p>
        </div>
      </div>
    </main>
  );
}


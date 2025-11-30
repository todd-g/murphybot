"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, FileText, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { useParams } from "next/navigation";

export default function NotePage() {
  const params = useParams();
  // Reconstruct the path from the catch-all route
  const pathSegments = params.path as string[];
  const notePath = pathSegments.join("/");

  const note = useQuery(api.notes.getByPath, { path: notePath });

  // Extract area prefix for back navigation
  const areaPrefix = note?.jdId?.charAt(0) || "0";

  if (note === undefined) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (note === null) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Note not found</p>
        <Link href="/browse" className="text-primary hover:underline mt-2">
          Back to Browse
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col p-6 pt-12">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Back link */}
        <Link
          href={`/browse/${areaPrefix}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Area
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4">
          <Image
            src="/logo.png"
            alt="MurphyBot"
            width={48}
            height={48}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                {note.jdId}
              </span>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{note.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{note.path}</p>
            {note.updatedAt && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Updated {new Date(note.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            <Markdown content={note.content} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}


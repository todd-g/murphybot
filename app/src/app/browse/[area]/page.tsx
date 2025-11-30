"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";

// JD Areas with their descriptions
const JD_AREAS: Record<string, { name: string; range: string; description: string }> = {
  "0": { name: "Index", range: "00-09", description: "System index & meta" },
  "1": { name: "Reference", range: "10-19", description: "Reference materials" },
  "2": { name: "Projects", range: "20-29", description: "Active projects" },
  "3": { name: "People", range: "30-39", description: "People & contacts" },
  "4": { name: "Media", range: "40-49", description: "Books, movies, etc." },
  "5": { name: "Events", range: "50-59", description: "Events & calendar" },
  "6": { name: "Ideas", range: "60-69", description: "Ideas & brainstorms" },
  "7": { name: "Home", range: "70-79", description: "Home & household" },
  "8": { name: "Personal", range: "80-89", description: "Personal notes" },
  "9": { name: "Archive", range: "90-99", description: "Archived content" },
};

export default function AreaPage() {
  const params = useParams();
  const areaPrefix = params.area as string;
  const area = JD_AREAS[areaPrefix];

  const notes = useQuery(api.notes.getByArea, { areaPrefix });

  if (!area) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Area not found</p>
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
          href="/browse"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Browse
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="MurphyBot"
            width={48}
            height={48}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                {area.range}
              </span>
              <h1 className="text-2xl font-bold">{area.name}</h1>
            </div>
            <p className="text-muted-foreground">{area.description}</p>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-3">
          {notes === undefined ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : notes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No notes in this area yet.
              </CardContent>
            </Card>
          ) : (
            notes.map((note) => (
              <Link key={note._id} href={`/note/${note.path}`} className="block">
                <Card className="transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {note.jdId}
                          </span>
                          <CardTitle className="text-base truncate">
                            {note.title}
                          </CardTitle>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {note.path}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {note.content.replace(/^#.*\n/, "").replace(/\n/g, " ").slice(0, 200)}
                      {note.content.length > 200 ? "..." : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}


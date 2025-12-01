"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { ArrowLeft, FileText, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// JD Areas with their descriptions
const JD_AREAS = [
  { prefix: "0", name: "Index", range: "00-09", description: "System index & meta" },
  { prefix: "1", name: "Reference", range: "10-19", description: "Reference materials" },
  { prefix: "2", name: "Projects", range: "20-29", description: "Active projects" },
  { prefix: "3", name: "People", range: "30-39", description: "People & contacts" },
  { prefix: "4", name: "Media", range: "40-49", description: "Books, movies, etc." },
  { prefix: "5", name: "Events", range: "50-59", description: "Events & calendar" },
  { prefix: "6", name: "Ideas", range: "60-69", description: "Ideas & brainstorms" },
  { prefix: "7", name: "Home", range: "70-79", description: "Home & household" },
  { prefix: "8", name: "Personal", range: "80-89", description: "Personal notes" },
  { prefix: "9", name: "Archive", range: "90-99", description: "Archived content" },
];

export default function BrowsePage() {
  const allNotes = useQuery(api.notes.getAll);

  // Count notes per area
  const noteCounts = JD_AREAS.map((area) => {
    const count = allNotes?.filter((note) => note.jdId.startsWith(area.prefix)).length || 0;
    return { ...area, count };
  });

  return (
    <main className="min-h-screen flex flex-col p-6 pt-12">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Browse Notes</h1>
          <p className="text-muted-foreground">
            Explore your knowledge by category
          </p>
        </div>

        {/* Areas Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {noteCounts.map((area) => (
            <Link
              key={area.prefix}
              href={`/browse/${area.prefix}`}
              className="block group"
            >
              <Card className="transition-all hover:border-primary/50 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                        {area.range}
                      </span>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {area.name}
                      </CardTitle>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {area.description}
                    </p>
                    {area.count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        {area.count}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}



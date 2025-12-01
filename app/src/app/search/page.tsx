"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search as SearchIcon, FileText } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

// JD area names for display
const JD_AREAS: Record<string, string> = {
  "0": "Index",
  "1": "Reference",
  "2": "Projects",
  "3": "People",
  "4": "Media",
  "5": "Events",
  "6": "Ideas",
  "7": "Home",
  "8": "Personal",
  "9": "Archive",
};

function getAreaName(jdId: string): string {
  const areaDigit = jdId.charAt(0);
  return JD_AREAS[areaDigit] || "Unknown";
}

function getSnippet(content: string, query: string, maxLength = 150): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);
  
  if (index === -1) {
    return content.slice(0, maxLength) + (content.length > maxLength ? "..." : "");
  }
  
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 100);
  let snippet = content.slice(start, end);
  
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";
  
  return snippet;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const results = useQuery(
    api.notes.search,
    searchTerm ? { query: searchTerm } : "skip"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchTerm(query.trim());
    }
  };

  return (
    <main className="min-h-screen flex flex-col p-6 pt-12">
      <div className="max-w-2xl w-full mx-auto flex flex-col flex-1 space-y-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <SearchIcon className="w-10 h-10 text-primary" />
            <h1 className="text-2xl font-bold">Search Notes</h1>
          </div>
          <p className="text-muted-foreground">
            Find notes by keyword
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for..."
            className="flex-1"
          />
          <Button type="submit" disabled={!query.trim()}>
            <SearchIcon className="w-4 h-4" />
          </Button>
        </form>

        {/* Results */}
        <div className="flex-1 space-y-3">
          {searchTerm && results === undefined && (
            <p className="text-center text-muted-foreground">Searching...</p>
          )}
          
          {searchTerm && results && results.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                No notes found for &ldquo;{searchTerm}&rdquo;
              </CardContent>
            </Card>
          )}

          {results && results.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                Found {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
              {results.map((note) => (
                <Link key={note._id} href={`/note/${note.path}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{note.title}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {note.jdId} · {getAreaName(note.jdId)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {getSnippet(note.content, searchTerm)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </>
          )}

          {!searchTerm && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                Enter a search term to find notes
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}


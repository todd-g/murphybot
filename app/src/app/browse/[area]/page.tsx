"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useParams } from "next/navigation";

// JD Areas with their descriptions
const JD_AREAS: Record<string, { name: string; range: string; description: string; folder: string }> = {
  "0": { name: "Index", range: "00-09", description: "System index & meta", folder: "00-index" },
  "1": { name: "Reference", range: "10-19", description: "Reference materials", folder: "10-reference" },
  "2": { name: "Projects", range: "20-29", description: "Active projects", folder: "20-projects" },
  "3": { name: "People", range: "30-39", description: "People & contacts", folder: "30-people" },
  "4": { name: "Media", range: "40-49", description: "Books, movies, etc.", folder: "40-media" },
  "5": { name: "Events", range: "50-59", description: "Events & calendar", folder: "50-events" },
  "6": { name: "Ideas", range: "60-69", description: "Ideas & brainstorms", folder: "60-ideas" },
  "7": { name: "Home", range: "70-79", description: "Home & household", folder: "70-home" },
  "8": { name: "Personal", range: "80-89", description: "Personal notes", folder: "80-personal" },
  "9": { name: "Archive", range: "90-99", description: "Archived content", folder: "90-archive" },
};

export default function AreaPage() {
  const params = useParams();
  const router = useRouter();
  const areaPrefix = params.area as string;
  const area = JD_AREAS[areaPrefix];
  
  const [showNewNote, setShowNewNote] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newJdId, setNewJdId] = useState(`${areaPrefix}0.01`);
  const [newContent, setNewContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const createNote = useMutation(api.notes.create);

  const notes = useQuery(api.notes.getByArea, { areaPrefix });

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newJdId.trim() || isCreating) return;
    
    setIsCreating(true);
    try {
      // Generate path from JD ID and title
      const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const path = `${area.folder}/${newJdId}-${slug}.md`;
      
      const result = await createNote({
        jdId: newJdId,
        path,
        title: newTitle,
        content: newContent || `# ${newTitle}\n\n`,
      });
      
      // Navigate to the new note
      router.push(`/note/${path}`);
    } catch (error) {
      console.error("Failed to create note:", error);
      alert("Failed to create note. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

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
        <div className="flex items-center justify-between gap-4">
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
          <Button onClick={() => setShowNewNote(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Note
          </Button>
        </div>

        {/* New Note Form */}
        {showNewNote && (
          <Card className="border-primary">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Create New Note</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewNote(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateNote} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Note title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jdId">JD ID</Label>
                    <Input
                      id="jdId"
                      value={newJdId}
                      onChange={(e) => setNewJdId(e.target.value)}
                      placeholder={`${areaPrefix}0.01`}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content (optional)</Label>
                  <Textarea
                    id="content"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Start writing..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewNote(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Note"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Notes List */}
        <div className="space-y-3">
          {notes === undefined ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : notes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">No notes in this area yet.</p>
                <Button onClick={() => setShowNewNote(true)} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create your first note
                </Button>
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


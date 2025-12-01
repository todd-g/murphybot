"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Inbox,
  Sparkles,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  FileText,
  Clock,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Id } from "../../../convex/_generated/dataModel";

// JD Areas for manual selection
const JD_AREAS = [
  { prefix: "0", name: "Index", folder: "00-index" },
  { prefix: "1", name: "Reference", folder: "10-reference" },
  { prefix: "2", name: "Projects", folder: "20-projects" },
  { prefix: "3", name: "People", folder: "30-people" },
  { prefix: "4", name: "Media", folder: "40-media" },
  { prefix: "5", name: "Events", folder: "50-events" },
  { prefix: "6", name: "Ideas", folder: "60-ideas" },
  { prefix: "7", name: "Home", folder: "70-home" },
  { prefix: "8", name: "Personal", folder: "80-personal" },
  { prefix: "9", name: "Archive", folder: "90-archive" },
];

interface Capture {
  _id: Id<"capture_queue">;
  createdAt: number;
  source: string;
  contentType: string;
  text?: string;
  fileUrl?: string | null;
  status?: string;
}

interface AISuggestion {
  area: string;
  areaName: string;
  folder: string;
  jdId: string;
  title: string;
  content: string;
  reasoning: string;
}

function CaptureCard({
  capture,
  onProcessed,
}: {
  capture: Capture;
  onProcessed: () => void;
}) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [editedSuggestion, setEditedSuggestion] = useState<AISuggestion | null>(null);
  
  const createNote = useMutation(api.notes.create);
  const markDone = useMutation(api.captures.markDone);
  const updateStatus = useMutation(api.captures.updateStatus);

  const handleAIProcess = async () => {
    setIsProcessing(true);
    setSuggestion(null);
    
    try {
      const response = await fetch("/api/process-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captureId: capture._id }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to process");
      }
      
      const data = await response.json();
      if (data.suggestion) {
        setSuggestion(data.suggestion);
        setEditedSuggestion(data.suggestion);
      }
    } catch (error) {
      console.error("AI processing failed:", error);
      alert("AI processing failed. Try again or use manual processing.");
      // Reset status
      await updateStatus({ id: capture._id, status: "pending" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = async () => {
    if (!editedSuggestion) return;
    
    setIsProcessing(true);
    try {
      const slug = editedSuggestion.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const path = `${editedSuggestion.folder}/${editedSuggestion.jdId}-${slug}.md`;
      
      await createNote({
        jdId: editedSuggestion.jdId,
        path,
        title: editedSuggestion.title,
        content: editedSuggestion.content,
      });
      
      await markDone({ id: capture._id });
      onProcessed();
      
      // Navigate to the new note
      router.push(`/note/${path}`);
    } catch (error) {
      console.error("Failed to create note:", error);
      alert("Failed to create note. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setSuggestion(null);
    setEditedSuggestion(null);
    await updateStatus({ id: capture._id, status: "pending" });
  };

  const handleManualCreate = async () => {
    if (!editedSuggestion) return;
    await handleAccept();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className={suggestion ? "border-primary" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {capture.contentType === "image" ? (
              <ImageIcon className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span className="capitalize">{capture.source}</span>
            <span>·</span>
            <Clock className="w-3 h-3" />
            <span>{formatDate(capture.createdAt)}</span>
          </div>
          
          {!suggestion && !showManual && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowManual(true);
                  setEditedSuggestion({
                    area: "6",
                    areaName: "Ideas",
                    folder: "60-ideas",
                    jdId: "60.01",
                    title: (capture.text || "").slice(0, 50).replace(/\n/g, " ") || "New Note",
                    content: `# Note\n\n${capture.text || ""}`,
                    reasoning: "Manual entry",
                  });
                }}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Manual
              </Button>
              <Button
                size="sm"
                onClick={handleAIProcess}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                Process with AI
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Original capture content */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm whitespace-pre-wrap">
            {capture.text || "[No text content]"}
          </p>
          {capture.fileUrl && (
            <div className="mt-2">
              <img
                src={capture.fileUrl}
                alt="Captured"
                className="max-h-48 rounded-lg object-contain"
              />
            </div>
          )}
        </div>

        {/* AI Suggestion or Manual Form */}
        {(suggestion || showManual) && editedSuggestion && (
          <div className="space-y-4 border-t pt-4">
            {suggestion && (
              <div className="flex items-start gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                <p className="text-muted-foreground">{suggestion.reasoning}</p>
              </div>
            )}
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`title-${capture._id}`}>Title</Label>
                <Input
                  id={`title-${capture._id}`}
                  value={editedSuggestion.title}
                  onChange={(e) =>
                    setEditedSuggestion({ ...editedSuggestion, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`jdId-${capture._id}`}>JD ID & Area</Label>
                <div className="flex gap-2">
                  <Input
                    id={`jdId-${capture._id}`}
                    value={editedSuggestion.jdId}
                    onChange={(e) =>
                      setEditedSuggestion({ ...editedSuggestion, jdId: e.target.value })
                    }
                    className="w-24"
                  />
                  <select
                    value={editedSuggestion.area}
                    onChange={(e) => {
                      const area = JD_AREAS.find((a) => a.prefix === e.target.value);
                      if (area) {
                        setEditedSuggestion({
                          ...editedSuggestion,
                          area: area.prefix,
                          areaName: area.name,
                          folder: area.folder,
                          jdId: `${area.prefix}0.01`,
                        });
                      }
                    }}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {JD_AREAS.map((area) => (
                      <option key={area.prefix} value={area.prefix}>
                        {area.prefix}0 - {area.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`content-${capture._id}`}>Content</Label>
              <Textarea
                id={`content-${capture._id}`}
                value={editedSuggestion.content}
                onChange={(e) =>
                  setEditedSuggestion({ ...editedSuggestion, content: e.target.value })
                }
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={showManual ? () => setShowManual(false) : handleReject}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={showManual ? handleManualCreate : handleAccept}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Create Note
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InboxPage() {
  const captures = useQuery(api.captures.getPending);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  const pendingCaptures = captures?.filter(
    (c) => !processedIds.has(c._id)
  );

  const handleProcessed = (id: string) => {
    setProcessedIds((prev) => new Set([...prev, id]));
  };

  return (
    <main className="min-h-screen flex flex-col p-6 pt-12">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Inbox className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-muted-foreground">
              Process captured items into your knowledge base
            </p>
          </div>
        </div>

        {/* Captures List */}
        <div className="space-y-4">
          {captures === undefined ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading captures...
              </CardContent>
            </Card>
          ) : pendingCaptures && pendingCaptures.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Inbox className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Inbox is empty!</p>
                <p className="text-sm text-muted-foreground">
                  Capture something new from the{" "}
                  <Link href="/capture" className="text-primary hover:underline">
                    capture page
                  </Link>
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {pendingCaptures?.length} item{pendingCaptures?.length !== 1 ? "s" : ""} to process
              </p>
              {pendingCaptures?.map((capture) => (
                <CaptureCard
                  key={capture._id}
                  capture={capture}
                  onProcessed={() => handleProcessed(capture._id)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}


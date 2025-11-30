"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Send, Image as ImageIcon, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CapturePage() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createCapture = useMutation(api.captures.create);
  const generateUploadUrl = useMutation(api.captures.generateUploadUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file) return;

    setIsSubmitting(true);
    setSuccess(false);

    try {
      let fileStorageId = undefined;

      // If there's a file, upload it first
      if (file) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        fileStorageId = storageId;
      }

      // Determine content type
      let contentType = "text";
      if (file && text.trim()) {
        contentType = "image+text";
      } else if (file) {
        contentType = "image";
      } else if (text.trim().match(/^https?:\/\//)) {
        contentType = "url";
      }

      // Create the capture
      await createCapture({
        source: "web",
        contentType,
        text: text.trim() || undefined,
        fileStorageId,
      });

      // Reset form
      setText("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to create capture:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-6 pt-12">
      <div className="max-w-lg w-full space-y-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Capture form */}
        <Card className="opacity-0 animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="MurphyBot"
                width={48}
                height={48}
                className="drop-shadow-md"
              />
              <CardTitle className="text-2xl">Quick Capture</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Text input */}
              <div className="space-y-2">
                <Label htmlFor="text">What&apos;s on your mind?</Label>
                <Textarea
                  id="text"
                  placeholder="Jot down a thought, paste a link, or describe an image..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[120px]"
                  disabled={isSubmitting}
                />
              </div>

              {/* File upload */}
              <div className="space-y-2">
                <Label htmlFor="file">Attach an image (optional)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="w-full justify-start"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {file ? file.name : "Choose image..."}
                  </Button>
                  {file && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || (!text.trim() && !file)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : success ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Captured!
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Capture
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help text */}
        <p className="text-center text-sm text-muted-foreground opacity-0 animate-fade-in stagger-1">
          Captures are saved to your inbox for processing with Claude in Cursor.
        </p>
      </div>
    </main>
  );
}


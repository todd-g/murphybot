import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// JD area descriptions for context
const JD_AREAS: Record<string, string> = {
  "0": "Index & System Meta",
  "1": "Reference Materials",
  "2": "Projects",
  "3": "People",
  "4": "Media (Books, Movies, etc.)",
  "5": "Events",
  "6": "Ideas & Brainstorms",
  "7": "Home & Household",
  "8": "Personal",
  "9": "Archive",
};

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // Search for relevant notes in Convex
    const searchResults = await convex.query(api.notes.search, {
      query: question,
    });

    // If no search results, get all notes as fallback (for small knowledge bases)
    let contextNotes = searchResults;
    if (searchResults.length === 0) {
      const allNotes = await convex.query(api.notes.getAll, {});
      // Take first 10 notes if search returned nothing
      contextNotes = allNotes.slice(0, 10);
    }

    // Format notes for Claude context
    const formattedNotes = contextNotes
      .map((note) => {
        const areaPrefix = note.jdId.charAt(0);
        const areaName = JD_AREAS[areaPrefix] || "Unknown";
        return `## ${note.title} (${note.jdId} - ${areaName})
Path: ${note.path}

${note.content}`;
      })
      .join("\n\n---\n\n");

    // Build the prompt
    const systemPrompt = `You are a helpful assistant that answers questions based on the user's personal knowledge base (their "second brain"). 

The knowledge base is organized using the Johnny.Decimal system with these areas:
- 00-09: Index & System Meta
- 10-19: Reference Materials
- 20-29: Projects
- 30-39: People
- 40-49: Media (Books, Movies, etc.)
- 50-59: Events
- 60-69: Ideas & Brainstorms
- 70-79: Home & Household
- 80-89: Personal
- 90-99: Archive

Answer questions based on the provided notes. If the information isn't in the notes, say so clearly. Be concise but helpful.`;

    const userMessage = contextNotes.length > 0
      ? `Here are relevant notes from the knowledge base:

${formattedNotes}

---

User's question: ${question}`
      : `The knowledge base is currently empty. The user asked: ${question}

Please let them know that there are no notes to search yet, and they should add some content to their second brain first.`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Extract text from response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({
      answer: responseText,
      sourcesCount: contextNotes.length,
    });
  } catch (error) {
    console.error("Error in /api/ask:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}


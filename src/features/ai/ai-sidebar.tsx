"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AI_FEATURES, type AiFeatureName } from "@/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const LABELS: Record<AiFeatureName, string> = {
  summarize: "Summarize",
  rewrite: "Rewrite",
  grammar: "Grammar",
  continue: "Continue",
  bullets: "Bullets",
  meeting_notes: "Meeting notes",
  title: "Suggest title",
  smart_tags: "Smart tags",
  chat: "Chat",
};

export function AiSidebar({
  documentId,
  text,
  onInsert,
  onTitle,
}: {
  documentId: string;
  text: string;
  onInsert: (value: string) => void;
  onTitle: (title: string) => void;
}) {
  const [chat, setChat] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(feature: AiFeatureName, instruction?: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature,
          text: feature === "chat" ? text : text || " ",
          documentId,
          instruction,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "AI failed");
      setOutput(json.data.text);
      if (feature === "title") onTitle(json.data.text.replace(/^["']|["']$/g, "").trim());
      if (feature === "smart_tags") {
        try {
          const tags = JSON.parse(json.data.text);
          toast.success(`Tags: ${(tags as string[]).join(", ")}`);
        } catch {
          toast.message(json.data.text);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="h-fit border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">AI assistant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {AI_FEATURES.filter((f) => f !== "chat").map((feature) => (
            <Button
              key={feature}
              size="xs"
              variant="outline"
              disabled={loading}
              onClick={() => void run(feature)}
            >
              {LABELS[feature]}
            </Button>
          ))}
        </div>
        <Textarea
          placeholder="Ask about this document…"
          value={chat}
          onChange={(e) => setChat(e.target.value)}
          rows={3}
        />
        <Button
          className="w-full"
          size="sm"
          disabled={loading || !chat.trim()}
          onClick={() => void run("chat", chat)}
        >
          {loading ? "Thinking…" : "Send"}
        </Button>
        {output ? (
          <ScrollArea className="h-48 rounded-md border p-3 text-sm">
            <p className="whitespace-pre-wrap">{output}</p>
            <Button
              className="mt-3"
              size="sm"
              variant="secondary"
              onClick={() => onInsert(output)}
            >
              Insert into doc
            </Button>
          </ScrollArea>
        ) : null}
      </CardContent>
    </Card>
  );
}

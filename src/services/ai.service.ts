import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import type { AiFeature } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { requireDocumentCapability } from "@/repositories/document.repository";
import { ApiError } from "@/server/security/http";
import { AI_CONFIG } from "@/config/app";
import type { AiFeatureName, AiProviderName } from "@/constants";

function resolveProvider(): {
  name: AiProviderName;
  model: ReturnType<ReturnType<typeof createOpenAI>>;
} {
  const provider = (process.env.AI_PROVIDER ??
    AI_CONFIG.defaultProvider) as AiProviderName;

  switch (provider) {
    case "gemini": {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new ApiError(
          500,
          "GOOGLE_GENERATIVE_AI_API_KEY is not set",
          "AI_CONFIG",
        );
      }
      const google = createGoogleGenerativeAI({ apiKey });
      return {
        name: "gemini",
        model: google(process.env.AI_MODEL || "gemini-2.0-flash") as never,
      };
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new ApiError(500, "OPENAI_API_KEY is not set", "AI_CONFIG");
      }
      const openai = createOpenAI({ apiKey });
      return {
        name: "openai",
        model: openai(process.env.AI_MODEL || "gpt-4o-mini") as never,
      };
    }
    case "groq":
    default: {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new ApiError(
          500,
          "GROQ_API_KEY is not set. Add your free Groq key to .env",
          "AI_CONFIG",
        );
      }
      const groq = createGroq({ apiKey });
      return {
        name: "groq",
        model: groq(
          process.env.AI_MODEL || AI_CONFIG.defaultModel,
        ) as never,
      };
    }
  }
}

const FEATURE_PROMPTS: Record<AiFeatureName, (text: string) => string> = {
  summarize: (t) => `Summarize the following document concisely:\n\n${t}`,
  rewrite: (t) => `Rewrite the following text more clearly:\n\n${t}`,
  grammar: (t) =>
    `Correct grammar and spelling. Return only the corrected text:\n\n${t}`,
  continue: (t) =>
    `Continue writing from where this leaves off, matching tone:\n\n${t}`,
  bullets: (t) => `Convert this into clear bullet points:\n\n${t}`,
  meeting_notes: (t) =>
    `Turn this into structured meeting notes with decisions and action items:\n\n${t}`,
  title: (t) =>
    `Suggest a short document title (max 8 words). Return only the title:\n\n${t}`,
  smart_tags: (t) =>
    `Suggest 3-6 short topical tags as a JSON string array only:\n\n${t}`,
  chat: (t) => t,
};

function featureToEnum(feature: AiFeatureName): AiFeature {
  const map: Record<AiFeatureName, AiFeature> = {
    summarize: "SUMMARIZE",
    rewrite: "REWRITE",
    grammar: "GRAMMAR",
    continue: "CONTINUE",
    bullets: "BULLETS",
    meeting_notes: "MEETING_NOTES",
    title: "TITLE",
    smart_tags: "SMART_TAGS",
    chat: "CHAT",
  };
  return map[feature];
}

export const aiService = {
  async run(params: {
    userId: string;
    documentId?: string;
    feature: AiFeatureName;
    text: string;
    instruction?: string;
  }) {
    if (params.documentId) {
      await requireDocumentCapability(params.documentId, params.userId, "read");
    }

    const clipped = params.text.slice(0, AI_CONFIG.maxPromptChars);
    if (!clipped.trim()) {
      throw new ApiError(
        400,
        "Add some document text before using AI",
        "EMPTY",
      );
    }

    const { name, model } = resolveProvider();
    const prompt =
      params.feature === "chat" && params.instruction
        ? `You are a helpful document assistant.\nDocument:\n${clipped}\n\nUser: ${params.instruction}`
        : FEATURE_PROMPTS[params.feature](clipped);

    const started = Date.now();
    const prisma = getPrisma();

    try {
      const result = await generateText({
        model: model as never,
        prompt,
        abortSignal: AbortSignal.timeout(AI_CONFIG.requestTimeoutMs),
      });

      await prisma.aiRequest.create({
        data: {
          provider: name.toUpperCase() as "OPENAI" | "GEMINI" | "GROQ",
          feature: featureToEnum(params.feature),
          success: true,
          latencyMs: Date.now() - started,
          userId: params.userId,
          documentId: params.documentId,
          metadata: { preview: clipped.slice(0, 200) },
        },
      });

      return {
        provider: name,
        feature: params.feature,
        text: result.text,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;

      const message =
        error instanceof Error ? error.message : "AI provider request failed";
      console.error("[ai]", name, message);

      await prisma.aiRequest.create({
        data: {
          provider: name.toUpperCase() as "OPENAI" | "GEMINI" | "GROQ",
          feature: featureToEnum(params.feature),
          success: false,
          latencyMs: Date.now() - started,
          error: message,
          userId: params.userId,
          documentId: params.documentId,
        },
      });

      throw new ApiError(502, message, "AI_FAILED");
    }
  },
};

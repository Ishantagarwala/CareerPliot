import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";

/**
 * Returns the configured OpenAI client.
 * If ZENMUX_API_KEY is present, it uses ZenMux's OpenAI-compatible endpoint.
 * If GEMINI_API_KEY is present, it configures the client to point to the Google Gemini API endpoint.
 * Otherwise, it uses the standard OpenAI API.
 */
export function getLlmClient(): OpenAI {
  const zenMuxKey = process.env.ZENMUX_API_KEY?.trim();
  const zenMuxBaseUrl = process.env.ZENMUX_BASE_URL?.trim() || "https://zenmux.ai/api/v1";
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  if (zenMuxKey) {
    return new OpenAI({
      apiKey: zenMuxKey,
      baseURL: zenMuxBaseUrl,
    });
  }

  if (geminiKey) {
    return new OpenAI({
      apiKey: geminiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }

  return new OpenAI({
    apiKey: openAiKey || "dummy-key",
  });
}

/**
 * Returns the model name to use.
 * Defaults to a ZenMux OpenAI model if ZENMUX_API_KEY is present,
 * "gemini-3.1-flash-lite" (or "gemini-3-flash" for PDF) if GEMINI_API_KEY is present,
 * or "gpt-4o-mini" (or "gpt-4o" for PDF) if using OpenAI. Can be overridden via environment variables.
 */
export function getLlmModel(isPdf = false): string {
  if (process.env.ZENMUX_API_KEY) {
    if (isPdf) {
      return process.env.ZENMUX_PDF_MODEL || process.env.ZENMUX_MODEL || "openai/gpt-4o";
    }
    return process.env.ZENMUX_MODEL || "openai/gpt-4o-mini";
  }

  if (process.env.GEMINI_API_KEY) {
    if (isPdf) {
      return process.env.GEMINI_PDF_MODEL || "gemini-3.5-flash";
    }
    return process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  }
  if (isPdf) {
    return process.env.OPENAI_PDF_MODEL || "gpt-4o";
  }
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function extractJsonContent(content: string): string {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

/**
 * Helper to call the LLM and expect a JSON response.
 * Handles setting up system prompts, user prompts, and parsing the output.
 */
export async function generateStructuredJson<T>(
  systemPrompt: string,
  userPrompt: string,
  isPdf = false
): Promise<T> {
  const client = getLlmClient();
  const model = getLlmModel(isPdf);

  try {
    const request: ChatCompletionCreateParamsNonStreaming = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    };

    const response = await client.chat.completions.create(
      process.env.ZENMUX_API_KEY
        ? request
        : { ...request, response_format: { type: "json_object" } }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from LLM");
    }

    const cleanContent = extractJsonContent(content);
    return JSON.parse(cleanContent) as T;
  } catch (error) {
    console.error("LLM Generation Error:", error);
    throw error;
  }
}

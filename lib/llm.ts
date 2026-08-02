import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";

const isPlaceholder = (val?: string) =>
  !val ||
  val.includes("your_") ||
  val.includes("_here") ||
  val === "dummy-key";

function requireRouterConfig(): { apiKey: string; baseURL: string } {
  const apiKey = process.env.LLM_ROUTER_API_KEY?.trim();
  const baseURL = process.env.LLM_ROUTER_BASE_URL?.trim();

  if (!apiKey || isPlaceholder(apiKey) || !baseURL) {
    throw new Error(
      "LLM router is not configured. Set LLM_ROUTER_API_KEY and LLM_ROUTER_BASE_URL in .env.local."
    );
  }

  return { apiKey, baseURL };
}

/** OpenAI-compatible client pointed at the configured LLM router. */
export function getLlmClient(): OpenAI {
  const { apiKey, baseURL } = requireRouterConfig();
  return new OpenAI({ apiKey, baseURL });
}

const FLAGSHIP_MODEL = "zeus/claude-opus-5";
const FALLBACK_MODEL = "posiden/deepseek-v4-flash";

/**
 * Model id for the LLM router.
 * - Explicit AI Hub selections (full model ids) are passed through
 * - Default: LLM_ROUTER_MODEL (flagship)
 * - Fallback: LLM_ROUTER_FALLBACK_MODEL or deepseek-v4-flash
 */
export function getLlmModel(isPdf = false, modelSelection?: string): string {
  const flagship =
    process.env.LLM_ROUTER_MODEL?.trim() || FLAGSHIP_MODEL;
  const fallback =
    process.env.LLM_ROUTER_FALLBACK_MODEL?.trim() ||
    process.env.LLM_ROUTER_PDF_MODEL?.trim() ||
    FALLBACK_MODEL;

  if (
    modelSelection &&
    modelSelection !== "primary" &&
    modelSelection !== "opus" &&
    modelSelection !== "gemini"
  ) {
    return modelSelection;
  }

  if (modelSelection === "opus") {
    return (
      process.env.LLM_ROUTER_OPUS_MODEL?.trim() ||
      flagship
    );
  }

  if (modelSelection === "gemini") {
    return (
      process.env.LLM_ROUTER_GEMINI_MODEL?.trim() ||
      fallback
    );
  }

  // PDF / lighter workloads prefer the fast fallback unless PDF model is set
  if (isPdf) {
    return process.env.LLM_ROUTER_PDF_MODEL?.trim() || fallback;
  }

  return flagship;
}

/** Many routers reject response_format=json_object; enable with LLM_ROUTER_JSON_MODE=true. */
function skipJsonResponseFormat(): boolean {
  const flag = process.env.LLM_ROUTER_JSON_MODE?.trim().toLowerCase();
  return flag !== "1" && flag !== "true" && flag !== "yes";
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

/** Call the LLM router and parse a JSON response. */
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
      skipJsonResponseFormat()
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

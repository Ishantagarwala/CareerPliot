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
 * - Default: LLM_ROUTER_MODEL
 * - PDF / "gemini" alias: LLM_ROUTER_FALLBACK_MODEL
 */
export function getLlmModel(isPdf = false, modelSelection?: string): string {
  const flagship = process.env.LLM_ROUTER_MODEL?.trim() || FLAGSHIP_MODEL;
  const fallback =
    process.env.LLM_ROUTER_FALLBACK_MODEL?.trim() || FALLBACK_MODEL;

  if (
    modelSelection &&
    modelSelection !== "primary" &&
    modelSelection !== "opus" &&
    modelSelection !== "gemini"
  ) {
    return modelSelection;
  }

  if (modelSelection === "opus" || modelSelection === "primary") {
    return flagship;
  }

  if (modelSelection === "gemini" || isPdf) {
    return fallback;
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

function isModelAccessError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 403 || status === 404) return true;
  const message = String(
    (error as { message?: string })?.message ||
      (error as { error?: { message?: string } })?.error?.message ||
      ""
  ).toLowerCase();
  return (
    message.includes("permission") ||
    message.includes("无权") ||
    message.includes("not found") ||
    message.includes("does not exist") ||
    message.includes("model_not_found")
  );
}

async function createStructuredCompletion(
  client: OpenAI,
  model: string,
  systemPrompt: string,
  userPrompt: string
) {
  const request: ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
  };

  return client.chat.completions.create(
    skipJsonResponseFormat()
      ? request
      : { ...request, response_format: { type: "json_object" } }
  );
}

/** Call the LLM router and parse a JSON response. Falls back to LLM_ROUTER_FALLBACK_MODEL on access errors. */
export async function generateStructuredJson<T>(
  systemPrompt: string,
  userPrompt: string,
  isPdf = false
): Promise<T> {
  const client = getLlmClient();
  const primary = getLlmModel(isPdf);
  const fallback = getLlmModel(true);
  const models =
    !isPdf && fallback !== primary ? [primary, fallback] : [primary];

  let lastError: unknown;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await createStructuredCompletion(
        client,
        model,
        systemPrompt,
        userPrompt
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from LLM");
      }

      const cleanContent = extractJsonContent(content);
      return JSON.parse(cleanContent) as T;
    } catch (error) {
      lastError = error;
      console.error(`LLM Generation Error (${model}):`, error);
      const canRetry =
        i < models.length - 1 && isModelAccessError(error);
      if (!canRetry) break;
      console.warn(`Retrying structured JSON with fallback model: ${models[i + 1]}`);
    }
  }

  throw lastError;
}

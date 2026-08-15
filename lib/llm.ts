import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FLAGSHIP_MODEL = "zeus/claude-opus-5";
const FALLBACK_MODEL = "posiden/deepseek-v4-flash";

const isPlaceholder = (val?: string) =>
  !val ||
  val.includes("your_") ||
  val.includes("_here") ||
  val === "dummy-key";

function isOllamaEnabled(): boolean {
  return process.env.USE_LOCAL_OLLAMA?.trim().toLowerCase() === "true";
}

function getOllamaConfig(): { apiKey: string; baseURL: string } {
  const baseURL = process.env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434/v1";
  return { apiKey: "ollama", baseURL };
}

/** Documented LLM_ROUTER_* vars, with optional ZENMUX_* aliases. */
function getRouterConfig(): { apiKey: string; baseURL: string } | null {
  const apiKey =
    process.env.LLM_ROUTER_API_KEY?.trim() ||
    process.env.ZENMUX_API_KEY?.trim();
  const baseURL =
    process.env.LLM_ROUTER_BASE_URL?.trim() ||
    process.env.ZENMUX_BASE_URL?.trim();

  if (!apiKey || isPlaceholder(apiKey) || !baseURL) return null;
  return { apiKey, baseURL };
}

function getFlagshipModel(): string {
  return (
    process.env.LLM_ROUTER_MODEL?.trim() ||
    process.env.ZENMUX_MODEL?.trim() ||
    FLAGSHIP_MODEL
  );
}

function getFallbackModel(): string {
  return (
    process.env.LLM_ROUTER_FALLBACK_MODEL?.trim() ||
    process.env.ZENMUX_PDF_MODEL?.trim() ||
    FALLBACK_MODEL
  );
}

// ─── Provider Definitions ────────────────────────────────────────────────────

interface LlmProvider {
  name: string;
  client: OpenAI;
  model: string;
}

/**
 * Ordered providers: documented LLM router (flagship → fallback), then Ollama if enabled.
 */
function buildProviderChain(): LlmProvider[] {
  const chain: LlmProvider[] = [];

  const router = getRouterConfig();
  if (router) {
    const client = new OpenAI(router);
    const primary = getFlagshipModel();
    chain.push({ name: `Router/${primary}`, client, model: primary });

    const fallback = getFallbackModel();
    if (fallback && fallback !== primary) {
      chain.push({ name: `Router/${fallback}`, client, model: fallback });
    }
  }

  if (isOllamaEnabled()) {
    const ollamaClient = new OpenAI(getOllamaConfig());
    const ollamaModel = process.env.OLLAMA_MODEL?.trim() || "llama3";
    chain.push({ name: `Ollama/${ollamaModel}`, client: ollamaClient, model: ollamaModel });

    const ollamaFallback = process.env.OLLAMA_FALLBACK_MODEL?.trim();
    if (ollamaFallback && ollamaFallback !== ollamaModel) {
      chain.push({ name: `Ollama/${ollamaFallback}`, client: ollamaClient, model: ollamaFallback });
    }
  }

  if (chain.length === 0) {
    throw new Error(
      "No LLM providers configured. Set LLM_ROUTER_API_KEY and LLM_ROUTER_BASE_URL in your .env file."
    );
  }

  return chain;
}

// ─── Public helpers (existing callers) ───────────────────────────────────────

/** OpenAI-compatible client pointed at the primary configured router. */
export function getLlmClient(): OpenAI {
  const chain = buildProviderChain();
  return chain[0].client;
}

/**
 * Model id for the LLM router.
 * - Explicit AI Hub selections (full model ids) are passed through
 * - Default: LLM_ROUTER_MODEL
 * - PDF / "gemini" alias: LLM_ROUTER_FALLBACK_MODEL
 */
export function getLlmModel(isPdf = false, modelSelection?: string): string {
  const chain = buildProviderChain();
  const flagship = getRouterConfig() ? getFlagshipModel() : chain[0].model;
  const fallback = getRouterConfig() ? getFallbackModel() : (chain[1]?.model ?? chain[0].model);

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

// ─── JSON Repair ─────────────────────────────────────────────────────────────

/**
 * Attempts to repair truncated JSON output from LLMs.
 * Closes unclosed arrays and objects and strips trailing broken values.
 */
function repairTruncatedJson(raw: string): string {
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    // continue to repair
  }

  let s = raw.trimEnd();

  s = s.replace(/[,:\s]+$/, "");

  const lastQuoteIdx = s.lastIndexOf('"');
  if (lastQuoteIdx !== -1) {
    const afterLastQuote = s.slice(lastQuoteIdx + 1);
    if (!afterLastQuote.includes('"') && !afterLastQuote.match(/^\s*[,}\]]/)) {
      s = s.slice(0, lastQuoteIdx).trimEnd().replace(/[,:\s]+$/, "");
    }
  }

  s = s.replace(/,\s*$/, "");

  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) stack.pop();
    }
  }

  const repaired = s + stack.reverse().join("");

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return raw;
  }
}

function extractJsonContent(content: string): string {
  const trimmed = content.trim();

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fencedMatch) return repairTruncatedJson(fencedMatch[1].trim());

  const firstBrace = trimmed.indexOf("{");
  if (firstBrace !== -1) return repairTruncatedJson(trimmed.slice(firstBrace));

  return repairTruncatedJson(trimmed);
}

// ─── Completion ───────────────────────────────────────────────────────────────

/** Many routers reject response_format=json_object; enable with LLM_ROUTER_JSON_MODE=true. */
function skipJsonResponseFormat(): boolean {
  const flag = process.env.LLM_ROUTER_JSON_MODE?.trim().toLowerCase();
  return flag !== "1" && flag !== "true" && flag !== "yes";
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

// ─── Main Public Function ─────────────────────────────────────────────────────

/**
 * Calls the LLM provider chain and returns a parsed JSON response.
 * Cascades through: router flagship → router fallback → Ollama (if enabled).
 */
export async function generateStructuredJson<T>(
  systemPrompt: string,
  userPrompt: string,
  isPdf = false
): Promise<T> {
  const chain = buildProviderChain();
  let providers = chain;
  if (isPdf && chain.length > 1) {
    const fallbackId = getRouterConfig() ? getFallbackModel() : chain[0].model;
    const idx = chain.findIndex((p) => p.model === fallbackId);
    if (idx > 0) {
      providers = [...chain.slice(idx), ...chain.slice(0, idx)];
    }
  }

  let lastError: unknown;

  for (let i = 0; i < providers.length; i++) {
    const { name, client, model } = providers[i];
    try {
      console.log(`[LLM] Trying provider ${i + 1}/${providers.length}: ${name}`);

      const response = await createStructuredCompletion(client, model, systemPrompt, userPrompt);

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error(`Empty response from ${name}`);

      const cleanContent = extractJsonContent(content);
      const parsed = JSON.parse(cleanContent) as T;

      console.log(`[LLM] Success with ${name}`);
      return parsed;
    } catch (error) {
      lastError = error;
      console.error(`[LLM] Provider ${name} failed:`, (error as Error).message || error);

      if (i < providers.length - 1) {
        console.warn(`[LLM] Falling back to next provider: ${providers[i + 1].name}`);
      }
    }
  }

  throw lastError ?? new Error("All LLM providers failed to generate a response.");
}

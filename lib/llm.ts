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

/** Documented LLM_ROUTER_* env vars. */
function getRouterConfig(): { apiKey: string; baseURL: string } | null {
  const apiKey = process.env.LLM_ROUTER_API_KEY?.trim();
  const baseURL = process.env.LLM_ROUTER_BASE_URL?.trim();

  if (!apiKey || isPlaceholder(apiKey) || !baseURL) return null;
  return { apiKey, baseURL };
}

function getFlagshipModel(): string {
  return process.env.LLM_ROUTER_MODEL?.trim() || FLAGSHIP_MODEL;
}

function getFallbackModel(): string {
  return process.env.LLM_ROUTER_FALLBACK_MODEL?.trim() || FALLBACK_MODEL;
}

/**
 * Optional secondary OpenAI-compatible router (e.g. Groq free tier).
 * Reads OLAMA_ROUTER_* first; the corrected OLLAMA_ROUTER_* spelling is
 * also accepted.
 */
function getSecondaryRouterConfig(): { apiKey: string; baseURL: string } | null {
  const apiKey =
    process.env.OLAMA_ROUTER_API_KEY?.trim() ||
    process.env.OLLAMA_ROUTER_API_KEY?.trim();
  const baseURL =
    process.env.OLAMA_ROUTER_BASE_URL?.trim() ||
    process.env.OLLAMA_ROUTER_BASE_URL?.trim();

  if (!apiKey || isPlaceholder(apiKey) || !baseURL) return null;
  return { apiKey, baseURL };
}

function getSecondaryRouterModels(): string[] {
  const models = [
    process.env.OLAMA_ROUTER_MODEL?.trim() ||
      process.env.OLLAMA_ROUTER_MODEL?.trim(),
    process.env.OLAMA_ROUTER_FALLBACK_MODEL?.trim() ||
      process.env.OLLAMA_ROUTER_FALLBACK_MODEL?.trim(),
  ].filter((model): model is string => Boolean(model));
  return Array.from(new Set(models));
}

/** Short label derived from the base URL host: api.groq.com → "groq". */
function routerLabel(baseURL: string): string {
  try {
    const host = new URL(baseURL).hostname;
    const parts = host.split(".");
    return parts.length >= 2 ? parts[parts.length - 2] : host;
  } catch {
    return "router";
  }
}

// ─── Provider Definitions ────────────────────────────────────────────────────

interface LlmProvider {
  name: string;
  client: OpenAI;
  model: string;
  baseURL: string;
}

/**
 * Ordered providers: documented LLM router (flagship → fallback), then the
 * secondary OLAMA_ROUTER_* router (e.g. Groq), then Ollama if enabled.
 */
function buildProviderChain(): LlmProvider[] {
  const chain: LlmProvider[] = [];

  const router = getRouterConfig();
  if (router) {
    const client = new OpenAI(router);
    const primary = getFlagshipModel();
    chain.push({ name: `Router/${primary}`, client, model: primary, baseURL: router.baseURL });

    const fallback = getFallbackModel();
    if (fallback && fallback !== primary) {
      chain.push({
        name: `Router/${fallback}`,
        client,
        model: fallback,
        baseURL: router.baseURL,
      });
    }
  }

  const secondary = getSecondaryRouterConfig();
  if (secondary && !chain.some((p) => p.baseURL === secondary.baseURL)) {
    const models = getSecondaryRouterModels();
    if (models.length === 0) {
      console.warn(
        "[LLM] Secondary router configured but OLAMA_ROUTER_MODEL is not set; skipping it."
      );
    } else {
      const client = new OpenAI(secondary);
      const label = routerLabel(secondary.baseURL);
      for (const model of models) {
        if (!chain.some((p) => p.model === model && p.baseURL === secondary.baseURL)) {
          chain.push({ name: `${label}/${model}`, client, model, baseURL: secondary.baseURL });
        }
      }
    }
  }

  if (isOllamaEnabled()) {
    const ollamaConfig = getOllamaConfig();
    const ollamaClient = new OpenAI(ollamaConfig);
    const ollamaModel = process.env.OLLAMA_MODEL?.trim() || "llama3";
    chain.push({
      name: `Ollama/${ollamaModel}`,
      client: ollamaClient,
      model: ollamaModel,
      baseURL: ollamaConfig.baseURL,
    });

    const ollamaFallback = process.env.OLLAMA_FALLBACK_MODEL?.trim();
    if (ollamaFallback && ollamaFallback !== ollamaModel) {
      chain.push({
        name: `Ollama/${ollamaFallback}`,
        client: ollamaClient,
        model: ollamaFallback,
        baseURL: ollamaConfig.baseURL,
      });
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

// ─── Router-aware model catalog (AI Hub) ─────────────────────────────────────

export interface ConfiguredRouter {
  client: OpenAI;
  baseURL: string;
  /** Prefix added to this router's model ids; empty for the primary router. */
  prefix: string;
}

/**
 * Every configured router client in chain order, with the display prefix its
 * models get in the AI Hub picker (e.g. "groq/" for the secondary router).
 * The primary router keeps unprefixed ids for backward compatibility.
 */
export function listConfiguredRouters(): ConfiguredRouter[] {
  const chain = buildProviderChain();
  const primaryBaseURL = chain[0].baseURL;

  const routers = new Map<string, ConfiguredRouter>();
  for (const provider of chain) {
    if (!routers.has(provider.baseURL)) {
      routers.set(provider.baseURL, {
        client: provider.client,
        baseURL: provider.baseURL,
        prefix: provider.baseURL === primaryBaseURL ? "" : `${routerLabel(provider.baseURL)}/`,
      });
    }
  }
  return Array.from(routers.values());
}

/**
 * Resolves a model selection to a concrete client + native model id.
 * - Native ids present in any router's chain entry match directly
 * - "<label>/<id>" (e.g. "groq/llama-3.1-8b-instant") selects that router
 * - Anything else falls back to the legacy alias handling on the primary router
 */
export function resolveLlmEndpoint(modelSelection?: string): {
  client: OpenAI;
  model: string;
} {
  const chain = buildProviderChain();

  const direct = chain.find((provider) => provider.model === modelSelection);
  if (direct) return { client: direct.client, model: direct.model };

  const slashIdx = modelSelection ? modelSelection.indexOf("/") : -1;
  if (modelSelection && slashIdx > 0) {
    const label = modelSelection.slice(0, slashIdx).toLowerCase();
    const nativeId = modelSelection.slice(slashIdx + 1);
    const prefixed = chain.find(
      (provider) =>
        provider.baseURL !== chain[0].baseURL &&
        routerLabel(provider.baseURL) === label &&
        provider.model === nativeId
    );
    if (prefixed) return { client: prefixed.client, model: prefixed.model };
  }

  return { client: chain[0].client, model: getLlmModel(false, modelSelection) };
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

// Routers commonly cap completions at a small default (e.g. 4096 tokens), which
// truncates large structured outputs like career roadmaps mid-JSON. Request a
// generous ceiling; the model only pays for what it actually emits.
const MAX_COMPLETION_TOKENS = Number(process.env.LLM_MAX_TOKENS?.trim()) || 12000;

/** Retry ceiling for providers that reject MAX_COMPLETION_TOKENS (e.g. Groq). */
const RETRY_COMPLETION_TOKENS = Math.min(MAX_COMPLETION_TOKENS, 4096);

function isMaxTokensError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return status === 400 && /max[_ ]?tokens/i.test(message);
}

async function createStructuredCompletion(
  client: OpenAI,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = MAX_COMPLETION_TOKENS
) {
  const request: ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: maxTokens,
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
 * Cascades through: router flagship → router fallback → secondary OLAMA_ROUTER_*
 * (e.g. Groq) → Ollama (if enabled).
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

      let response;
      try {
        response = await createStructuredCompletion(client, model, systemPrompt, userPrompt);
      } catch (error) {
        if (!isMaxTokensError(error)) throw error;
        console.warn(
          `[LLM] ${name} rejected max_tokens=${MAX_COMPLETION_TOKENS}; retrying with ${RETRY_COMPLETION_TOKENS}`
        );
        response = await createStructuredCompletion(
          client,
          model,
          systemPrompt,
          userPrompt,
          RETRY_COMPLETION_TOKENS
        );
      }

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

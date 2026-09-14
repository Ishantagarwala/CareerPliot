import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FLAGSHIP_MODEL = "deepseek-ai/DeepSeek-V4-Flash";
const FALLBACK_MODEL = "zai-org/GLM-5.3-Flash";

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

/**
 * Optional SECOND router, configured exactly like the first but with a `_2`
 * suffix. It sits alongside the primary provider rather than replacing it, so
 * its models appear in the AI Hub picker under their own host label (e.g.
 * "deepseek/…") and can be selected per conversation.
 *
 * Only a key and a base URL are needed: the model catalogue is read from the
 * provider itself, so there is nothing to declare here.
 */
function getSecondRouterConfig(): { apiKey: string; baseURL: string } | null {
  const apiKey = process.env.LLM_ROUTER_2_API_KEY?.trim();
  const baseURL = process.env.LLM_ROUTER_2_BASE_URL?.trim();

  if (!apiKey || isPlaceholder(apiKey) || !baseURL) return null;
  return { apiKey, baseURL };
}

function getFlagshipModel(): string {
  return process.env.LLM_ROUTER_MODEL?.trim() || FLAGSHIP_MODEL;
}

function getFallbackModel(): string {
  return process.env.LLM_ROUTER_FALLBACK_MODEL?.trim() || FALLBACK_MODEL;
}

/** Short label derived from the base URL host: api.example.com → "example". */
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
 * Ordered providers: documented LLM router (flagship → fallback), then Ollama
 * if enabled.
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

  /*
   * The second router deliberately does NOT join the automatic fallback chain:
   * with no model id declared we cannot pick one on its behalf, and guessing
   * would turn every automatic call into a 404. It is reached by selecting one
   * of its models in the picker, which is resolved by label in
   * resolveLlmEndpoint below.
   */
  const secondRouter = getSecondRouterConfig();
  if (secondRouter) {
    const client = new OpenAI(secondRouter);
    const explicit = process.env.LLM_ROUTER_2_MODEL?.trim();
    if (explicit) {
      chain.push({
        name: `Router2/${explicit}`,
        client,
        model: explicit,
        baseURL: secondRouter.baseURL,
      });
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
 * Every configured router client, in preference order, with the display prefix
 * its models get in the AI Hub picker (e.g. "together/" for a second router).
 * The primary router keeps unprefixed ids for backward compatibility.
 *
 * Built from the router configs rather than the fallback chain: the chain only
 * holds models named explicitly in env, whereas a router can serve an
 * arbitrary catalogue that must still be selectable.
 */
export function listConfiguredRouters(): ConfiguredRouter[] {
  const primaryBaseURL = getRouterConfig()?.baseURL;
  const routers: ConfiguredRouter[] = [];
  const seen = new Set<string>();

  const add = (config: { apiKey: string; baseURL: string } | null) => {
    if (!config || seen.has(config.baseURL)) return;
    seen.add(config.baseURL);
    routers.push({
      client: new OpenAI(config),
      baseURL: config.baseURL,
      prefix:
        config.baseURL === primaryBaseURL ? "" : `${routerLabel(config.baseURL)}/`,
    });
  };

  add(getRouterConfig());
  add(getSecondRouterConfig());
  if (isOllamaEnabled()) add(getOllamaConfig());

  return routers;
}

/**
 * Resolves a model selection to a concrete client + native model id.
 * - "<label>/<id>" (e.g. "together/llama-3") selects that router, whether or
 *   not the id appears in the fallback chain
 * - Native ids present in the chain match directly
 * - Anything else falls back to the legacy alias handling on the primary router
 */
export function resolveLlmEndpoint(modelSelection?: string): {
  client: OpenAI;
  model: string;
} {
  const chain = buildProviderChain();
  const primaryBaseURL = chain[0].baseURL;

  const direct = chain.find((provider) => provider.model === modelSelection);
  if (direct) return { client: direct.client, model: direct.model };

  const slashIdx = modelSelection ? modelSelection.indexOf("/") : -1;
  if (modelSelection && slashIdx > 0) {
    const label = modelSelection.slice(0, slashIdx).toLowerCase();
    const nativeId = modelSelection.slice(slashIdx + 1);

    // Chain entries first (keeps the existing Ollama / router behaviour)…
    const prefixed = chain.find(
      (provider) =>
        provider.baseURL !== primaryBaseURL &&
        routerLabel(provider.baseURL) === label &&
        provider.model === nativeId
    );
    if (prefixed) return { client: prefixed.client, model: prefixed.model };

    // …then any other configured router, so unlisted catalogue models work.
    const router = listConfiguredRouters().find(
      (r) => r.prefix.toLowerCase() === `${label}/`
    );
    if (router) return { client: router.client, model: nativeId };
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

  // Close a string the output was truncated in the middle of — the most common
  // truncation shape. A trailing lone backslash would escape the added quote.
  let closers = "";
  if (escape) closers += "\\";
  if (inString) closers += '"';

  const repaired = s + closers + stack.reverse().join("");

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

  // Prompts may request JSON arrays (e.g. project ideas) — slice from whichever
  // of "[" or "{" appears first, or array responses get mangled into "{...},...]".
  const firstObject = trimmed.indexOf("{");
  const firstArray = trimmed.indexOf("[");
  if (firstArray !== -1 && (firstObject === -1 || firstArray < firstObject)) {
    return repairTruncatedJson(trimmed.slice(firstArray));
  }
  if (firstObject !== -1) return repairTruncatedJson(trimmed.slice(firstObject));

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

/** Retry ceiling for providers that reject MAX_COMPLETION_TOKENS. */
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

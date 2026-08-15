import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Provider Definitions ────────────────────────────────────────────────────

interface LlmProvider {
  name: string;
  client: OpenAI;
  model: string;
}

/**
 * Returns an ordered list of providers to try, from most capable to fallback.
 * Order: Zenmux claude-opus-5 → Zenmux gpt-5.6-sol → Groq llama → Ollama (if enabled)
 */
function buildProviderChain(): LlmProvider[] {
  const chain: LlmProvider[] = [];

  // 1. Zenmux (api.17.wtf) — most capable, primary router
  const zenmuxKey = process.env.ZENMUX_API_KEY?.trim();
  const zenmuxBase = process.env.ZENMUX_BASE_URL?.trim();
  if (zenmuxKey && !isPlaceholder(zenmuxKey) && zenmuxBase) {
    const client = new OpenAI({ apiKey: zenmuxKey, baseURL: zenmuxBase });

    const primaryModel = process.env.ZENMUX_MODEL?.trim() || "zeus/claude-opus-5";
    chain.push({ name: `Zenmux/${primaryModel}`, client, model: primaryModel });

    const pdfModel = process.env.ZENMUX_PDF_MODEL?.trim();
    if (pdfModel && pdfModel !== primaryModel) {
      chain.push({ name: `Zenmux/${pdfModel}`, client, model: pdfModel });
    }
  }

  // 2. Groq / LLM Router fallback
  const groqKey = process.env.LLM_ROUTER_API_KEY?.trim();
  const groqBase = process.env.LLM_ROUTER_BASE_URL?.trim();
  if (groqKey && !isPlaceholder(groqKey) && groqBase) {
    const client = new OpenAI({ apiKey: groqKey, baseURL: groqBase });

    const model1 = process.env.LLM_ROUTER_MODEL?.trim() || "llama-3.1-8b-instant";
    chain.push({ name: `Groq/${model1}`, client, model: model1 });

    const model2 = process.env.LLM_ROUTER_FALLBACK_MODEL?.trim();
    if (model2 && model2 !== model1) {
      chain.push({ name: `Groq/${model2}`, client, model: model2 });
    }
  }

  // 3. Local Ollama (if enabled)
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
      "No LLM providers configured. Set ZENMUX_API_KEY or LLM_ROUTER_API_KEY in your .env file."
    );
  }

  return chain;
}

// ─── Legacy model helpers (for existing callers) ─────────────────────────────

/** OpenAI-compatible client pointed at the primary configured router. */
export function getLlmClient(): OpenAI {
  const chain = buildProviderChain();
  return chain[0].client;
}

/** Returns primary model id. */
export function getLlmModel(isPdf = false, _modelSelection?: string): string {
  const chain = buildProviderChain();
  if (isPdf && chain.length > 1) return chain[1].model;
  return chain[0].model;
}

// ─── JSON Repair ─────────────────────────────────────────────────────────────

/**
 * Attempts to repair truncated JSON output from LLMs.
 * Closes unclosed arrays and objects and strips trailing broken values.
 */
function repairTruncatedJson(raw: string): string {
  // Fast path — valid JSON
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    // continue to repair
  }

  let s = raw.trimEnd();

  // Strip trailing comma or colon
  s = s.replace(/[,:\s]+$/, "");

  // Strip an unclosed string value (last " opened but never closed)
  const lastQuoteIdx = s.lastIndexOf('"');
  if (lastQuoteIdx !== -1) {
    const afterLastQuote = s.slice(lastQuoteIdx + 1);
    if (!afterLastQuote.includes('"') && !afterLastQuote.match(/^\s*[,\}\]]/)) {
      s = s.slice(0, lastQuoteIdx).trimEnd().replace(/[,:\s]+$/, "");
    }
  }

  // Strip trailing commas exposed by above
  s = s.replace(/,\s*$/, "");

  // Walk string tracking open bracket/brace depth
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
    return raw; // let outer handler deal with it
  }
}

function extractJsonContent(content: string): string {
  const trimmed = content.trim();

  // Strip markdown code fences
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fencedMatch) return repairTruncatedJson(fencedMatch[1].trim());

  // Extract from first {
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
    max_tokens: 4000,
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
 * Cascades through: Zenmux claude-opus-5 → Zenmux gpt-5.6-sol → Groq → Ollama
 * Retries on EVERY error (access errors AND JSON parse errors).
 */
export async function generateStructuredJson<T>(
  systemPrompt: string,
  userPrompt: string,
  _isPdf = false
): Promise<T> {
  let chain: LlmProvider[];
  try {
    chain = buildProviderChain();
  } catch (configErr) {
    throw configErr;
  }

  let lastError: unknown;

  for (let i = 0; i < chain.length; i++) {
    const { name, client, model } = chain[i];
    try {
      console.log(`[LLM] Trying provider ${i + 1}/${chain.length}: ${name}`);

      const response = await createStructuredCompletion(client, model, systemPrompt, userPrompt);

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error(`Empty response from ${name}`);

      const cleanContent = extractJsonContent(content);
      const parsed = JSON.parse(cleanContent) as T;

      console.log(`[LLM] ✅ Success with ${name}`);
      return parsed;
    } catch (error) {
      lastError = error;
      console.error(`[LLM] ❌ Provider ${name} failed:`, (error as Error).message || error);

      if (i < chain.length - 1) {
        console.warn(`[LLM] ⚡ Falling back to next provider: ${chain[i + 1].name}`);
      }
    }
  }

  throw lastError ?? new Error("All LLM providers failed to generate a response.");
}

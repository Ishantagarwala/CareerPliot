/**
 * Model availability and resilient model selection.
 *
 * WHY THIS EXISTS
 *
 * Two independent faults made the AI Hub fail on every path:
 *
 * 1. `LLM_ROUTER_MODEL` was set to `deepseek-ai/DeepSeek-V4-Flash` — a model the
 *    provider does not have (its catalogue has `DeepSeek-V4.1-Flash`, with a
 *    ".1"). Every request 404'd with `Model not available.`
 * 2. `LLM_ROUTER_FALLBACK_MODEL` was dead code. `getLlmModel()` consulted the
 *    fallback only for PDFs or the "gemini" alias, so a plain chat had no second
 *    chance: one bad name took down the whole feature.
 *
 * A third fault compounded both: `reasoning_effort` was forwarded raw, and some
 * models reject most of the levels the picker offers —
 *
 *   deepseek-ai/DeepSeek-V4.1-Flash: 400 "reasoning_effort must be low, high, xhigh, max"
 *
 * — so even a model that EXISTS could fail on the app's own default value
 * ("medium"). The catalogue's first `deepseek-ai/` entry happened to be that
 * model, so the auto-selected default was the one model guaranteed to 400.
 *
 * The rules here are deliberately conservative: availability is only ever
 * ASSERTED from the live catalogue. If the catalogue cannot be read, the
 * caller's choice is honoured rather than second-guessed, because wrongly
 * swapping a working model is worse than leaving a broken one.
 */

/** How long a fetched catalogue is trusted. Short enough to notice removals. */
const CATALOGUE_TTL_MS = 60_000;
/** Hard cap on catalogue reads, so a slow router cannot stall a chat request. */
const CATALOGUE_TIMEOUT_MS = 4_000;

interface CatalogueEntry {
  ids: readonly string[];
  fetchedAt: number;
}

/**
 * The primary router's credentials.
 *
 * Read here rather than imported from `lib/llm.ts` to keep this module free of
 * a cycle — `llm.ts` imports this back for the chat path.
 */
function routerConfig(): { apiKey: string; baseURL: string } | null {
  const apiKey = process.env.LLM_ROUTER_API_KEY?.trim();
  const baseURL = process.env.LLM_ROUTER_BASE_URL?.trim();
  if (!apiKey || !baseURL) return null;
  return { apiKey, baseURL };
}

let catalogue: CatalogueEntry | null = null;
let inFlight: Promise<readonly string[] | null> | null = null;

/**
 * Model families whose reasoning levels differ from the full provider set.
 *
 * Keyed by a substring of the model id. Checking the id rather than the router
 * matters because one router serves many families — which is exactly how this
 * bit us: GLM accepted all seven levels while V4.1 accepted four.
 */
const EFFORT_RULES: Array<{ match: RegExp; allowed: readonly string[] }> = [
  {
    match: /deepseek-v4\.1/i,
    // The provider states this set explicitly in its 400 message.
    allowed: ["low", "high", "xhigh", "max"],
  },
];

/** Levels that every configured model is expected to accept. */
const SAFE_EFFORT = "low";

/**
 * The provider's catalogue, or `null` when it could not be read.
 *
 * `null` means "unknown", NOT "empty" — callers must treat it as permission to
 * proceed with whatever was asked for. Conflating the two would turn a router
 * hiccup into "every model is missing", which is a worse outage than the one
 * this module prevents.
 */
export async function getModelCatalogue(): Promise<readonly string[] | null> {
  const now = Date.now();
  if (catalogue && now - catalogue.fetchedAt < CATALOGUE_TTL_MS) {
    return catalogue.ids;
  }
  if (inFlight) return inFlight;

  const config = routerConfig();
  if (!config) return catalogue?.ids ?? null;

  inFlight = (async () => {
    try {
      const res = await fetch(`${config.baseURL.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        signal: AbortSignal.timeout(CATALOGUE_TIMEOUT_MS),
      });
      if (!res.ok) return catalogue?.ids ?? null;
      const body = (await res.json()) as { data?: Array<{ id?: unknown }> };
      const ids = (body.data ?? [])
        .map((m) => m?.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      if (ids.length === 0) return catalogue?.ids ?? null;
      catalogue = { ids, fetchedAt: Date.now() };
      return ids;
    } catch {
      // Network, timeout, malformed body — all mean "unknown", not "absent".
      return catalogue?.ids ?? null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Clears the cache. Exported for tests, which must not see a stale catalogue. */
export function resetModelCatalogue(): void {
  catalogue = null;
  inFlight = null;
}

/**
 * Narrows a requested effort to one the given model accepts.
 *
 * Returns `undefined` when the value cannot be honoured, so the field is
 * omitted rather than sent and rejected — an absent field lets the provider
 * apply its own default, which is always valid.
 */
export function effortForModel(
  model: string,
  effort: string | undefined
): string | undefined {
  if (!effort) return undefined;
  const rule = EFFORT_RULES.find((r) => r.match.test(model));
  if (!rule) return effort;
  return rule.allowed.includes(effort) ? effort : undefined;
}

/**
 * True when the provider rejected the request because of the MODEL itself —
 * as opposed to a bad key, a rate limit, or malformed messages.
 *
 * Only these failures justify trying a different model. Retrying on a 429 or a
 * 401 would multiply the failure instead of routing around it.
 */
export function isModelUnavailableError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  const message = String((error as { message?: string } | null)?.message ?? "");

  if (status === 404) return true;

  // Some routers report a missing model as 400 rather than 404.
  if (status === 400 && /model/i.test(message)) {
    if (/not available|not found|does not exist|unknown model|invalid model|unsupported model/i.test(message)) {
      return true;
    }
  }
  return /model not available|model not found|does not exist/i.test(message);
}

/**
 * True when the failure is purely about `reasoning_effort`.
 *
 * Worth separating: the model is fine, only the parameter is wrong, so the
 * right response is to retry the SAME model without the field rather than
 * downgrade to a different model.
 */
export function isEffortRejection(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  const message = String((error as { message?: string } | null)?.message ?? "");
  return status === 400 && /reasoning_effort|reasoning effort/i.test(message);
}

/**
 * The models to try, in order, for a requested selection.
 *
 * The request is always first, so a working choice is never overridden. What
 * follows is the rest of the live catalogue, ordered so the model the app
 * treats as its default comes before arbitrary ones.
 *
 * When the catalogue is unreadable this returns `[requested]` — one attempt,
 * unchanged behaviour, no guessing.
 */
export async function candidateModels(
  requested: string | undefined,
  preferred: readonly (string | undefined)[]
): Promise<string[]> {
  if (!requested) return [];
  const ids = await getModelCatalogue();
  if (!ids || ids.length === 0) return [requested];

  const out: string[] = [];
  const push = (id: string | undefined) => {
    if (id && ids.includes(id) && !out.includes(id)) out.push(id);
  };

  push(requested);
  for (const p of preferred) push(p);
  // Anything else that exists, so a removed model still has somewhere to go.
  for (const id of ids) push(id);

  // The request is not in the catalogue: keep it FIRST anyway. It may be newly
  // added and the cached list stale — trying it costs one request, whereas
  // dropping it would make a brand-new model impossible to select.
  if (out[0] !== requested) out.unshift(requested);

  return out;
}

/** The effort to use for the first attempt at a model. */
export function initialEffort(model: string, requested: string | undefined): string | undefined {
  return effortForModel(model, requested);
}

/** A safe fallback effort, used when the provider rejects the requested one. */
export function safeEffortFor(model: string): string | undefined {
  return effortForModel(model, SAFE_EFFORT);
}

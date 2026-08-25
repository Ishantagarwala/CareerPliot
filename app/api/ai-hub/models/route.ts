import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listConfiguredRouters } from "@/lib/llm";

function baseModelName(id: string): string {
  const slash = id.indexOf("/");
  return (slash === -1 ? id : id.slice(slash + 1)).toLowerCase();
}

function providerPrefix(id: string): string {
  const slash = id.indexOf("/");
  return slash === -1 ? "" : id.slice(0, slash).toLowerCase();
}

/**
 * Routers list non-chat models too (transcription, TTS, safety classifiers).
 * Exclude them so the picker only offers models the chat endpoint can serve.
 */
const NON_CHAT_NAME_PATTERN = /prompt[-_]?guard/i;

function isChatCapable(model: Record<string, unknown>): boolean {
  const id = typeof model.id === "string" ? model.id : "";
  const name = typeof model.name === "string" ? model.name : "";
  if (NON_CHAT_NAME_PATTERN.test(id) || NON_CHAT_NAME_PATTERN.test(name)) {
    return false;
  }
  const outputs = Array.isArray(model.output_modalities)
    ? (model.output_modalities as unknown[])
    : null;
  // Absent metadata (plain OpenAI-compatible routers) means "assume chat".
  return !outputs || outputs.includes("text");
}

/** Prefer env default, then a stable provider order, then first seen. */
function preferenceScore(id: string, preferred?: string): number {
  if (preferred && id === preferred) return 1000;
  if (preferred && baseModelName(id) === baseModelName(preferred)) {
    if (providerPrefix(id) === providerPrefix(preferred)) return 900;
  }
  const order = ["zeus", "posiden", "ares", "latina", "openai", "anthropic", "google"];
  const idx = order.indexOf(providerPrefix(id));
  return idx === -1 ? 0 : 100 - idx;
}

/**
 * Fetch models from every configured router (primary + secondary e.g. Groq)
 * and return unique entries. Secondary-router ids are prefixed with their
 * host label ("groq/llama-3.1-8b-instant") so the chat route can send the
 * request to the right provider; models that only differ by provider prefix
 * on the same router are collapsed to a single option.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const routers = listConfiguredRouters();
    const listings = await Promise.allSettled(
      routers.map((router) => router.client.models.list())
    );

    const preferred = process.env.LLM_ROUTER_MODEL?.trim() || undefined;
    const rawIds: string[] = [];
    let failedRouters = 0;

    routers.forEach((router, index) => {
      const listing = listings[index];
      if (listing.status !== "fulfilled") {
        failedRouters += 1;
        console.error(
          `Failed to fetch models from ${router.baseURL}:`,
          listing.reason
        );
        return;
      }
      for (const model of listing.value.data || []) {
        if (!model || typeof model.id !== "string" || !model.id.trim()) continue;
        if (!isChatCapable(model as unknown as Record<string, unknown>)) continue;
        rawIds.push(`${router.prefix}${model.id.trim()}`);
      }
    });

    if (rawIds.length === 0) {
      return NextResponse.json(
        { message: "Failed to fetch models from all configured routers" },
        { status: 502 }
      );
    }

    // First pass: unique full IDs
    const uniqueIds = Array.from(new Set(rawIds));

    // Second pass: one entry per base model name
    const byBase = new Map<string, string>();
    for (const id of uniqueIds) {
      const base = baseModelName(id);
      const existing = byBase.get(base);
      if (!existing) {
        byBase.set(base, id);
        continue;
      }
      if (preferenceScore(id, preferred) > preferenceScore(existing, preferred)) {
        byBase.set(base, id);
      }
    }

    const models = Array.from(byBase.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    const defaultModel =
      (preferred && models.includes(preferred) && preferred) ||
      models.find((m) => m === preferred) ||
      models.find((m) => baseModelName(m) === (preferred ? baseModelName(preferred) : "")) ||
      models.find((m) => m.startsWith("posiden/")) ||
      models[0] ||
      null;

    return NextResponse.json({
      models,
      defaultModel,
      meta: {
        totalFromRouter: rawIds.length,
        uniqueIds: uniqueIds.length,
        uniqueModels: models.length,
        routersConfigured: routers.length,
        routersFailed: failedRouters,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to fetch models from custom router:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch models";
    return NextResponse.json({ message }, { status: 500 });
  }
}

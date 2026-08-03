import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLlmClient } from "@/lib/llm";

function baseModelName(id: string): string {
  const slash = id.indexOf("/");
  return (slash === -1 ? id : id.slice(slash + 1)).toLowerCase();
}

function providerPrefix(id: string): string {
  const slash = id.indexOf("/");
  return slash === -1 ? "" : id.slice(0, slash).toLowerCase();
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
 * Fetch models from the configured LLM router and return unique entries.
 * Models that only differ by provider prefix (e.g. ares/gpt-5.6-sol vs
 * latina/gpt-5.6-sol) are collapsed to a single option.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const client = getLlmClient();
    const list = await client.models.list();

    const preferred = process.env.LLM_ROUTER_MODEL?.trim() || undefined;

    const rawIds = (list.data || [])
      .map((m) => (typeof m?.id === "string" ? m.id.trim() : ""))
      .filter(Boolean);

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
      },
    });
  } catch (error: unknown) {
    console.error("Failed to fetch models from custom router:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch models";
    return NextResponse.json({ message }, { status: 500 });
  }
}

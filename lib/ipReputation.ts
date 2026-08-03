/**
 * Block datacenter / hosting / VPN / proxy IPs on auth.
 *
 * Primary: ip-api.com (free, no key) — `proxy` + `hosting` flags.
 * Optional: PROXYCHECK_API_KEY for proxycheck.io (vpn=1).
 *
 * Local / private IPs are always allowed (dev). Demo account bypasses checks.
 * On lookup failure: allow by default (fail-open). Set IP_REPUTATION_STRICT=true
 * to reject when reputation cannot be determined.
 */

import { DEMO_ACCOUNT_EMAIL } from "@/lib/captcha";

export type IpReputationResult = {
  ok: boolean;
  reason?: string;
  /** Detected as VPN / proxy / Tor */
  isVpnOrProxy?: boolean;
  /** Detected as datacenter / hosting */
  isDatacenter?: boolean;
  provider?: string;
};

const cache = new Map<string, { result: IpReputationResult; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const LOOKUP_TIMEOUT_MS = 4_000;

function flagTrue(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function isStrictMode(): boolean {
  return flagTrue(process.env.IP_REPUTATION_STRICT);
}

/** IPv4 private / loopback / link-local, and IPv6 loopback / ULA. */
export function isPrivateOrLocalIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  if (!v || v === "unknown" || v === "localhost") return true;
  if (v === "::1" || v === "0:0:0:0:0:0:0:1") return true;
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80:")) return true;

  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(v);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  return false;
}

async function fetchJson(
  url: string,
  init?: RequestInit
): Promise<Record<string, unknown> | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    console.warn("[ip-reputation] lookup failed:", url.split("?")[0], err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupIpApi(ip: string): Promise<IpReputationResult | null> {
  // Free tier is HTTP-only; works fine from the server.
  const data = await fetchJson(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,proxy,hosting,query`
  );
  if (!data || data.status !== "success") return null;

  const isVpnOrProxy = Boolean(data.proxy);
  const isDatacenter = Boolean(data.hosting);

  if (isVpnOrProxy || isDatacenter) {
    return {
      ok: false,
      isVpnOrProxy,
      isDatacenter,
      provider: "ip-api",
      reason: isVpnOrProxy
        ? "VPNs and proxies are not allowed. Please disconnect and try again."
        : "Datacenter / hosting IPs are not allowed. Please use a residential connection.",
    };
  }

  return { ok: true, isVpnOrProxy: false, isDatacenter: false, provider: "ip-api" };
}

async function lookupProxyCheck(ip: string): Promise<IpReputationResult | null> {
  const key = process.env.PROXYCHECK_API_KEY?.trim();
  const qs = new URLSearchParams({
    vpn: "1",
    asn: "1",
    risk: "1",
  });
  if (key) qs.set("key", key);

  const data = await fetchJson(
    `https://proxycheck.io/v2/${encodeURIComponent(ip)}?${qs.toString()}`
  );
  if (!data || data.status !== "ok") return null;

  const entry = data[ip] as Record<string, unknown> | undefined;
  if (!entry || typeof entry !== "object") return null;

  const proxyFlag = String(entry.proxy || "").toLowerCase() === "yes";
  const type = String(entry.type || "").toLowerCase();
  const isVpnOrProxy =
    proxyFlag ||
    type.includes("vpn") ||
    type.includes("proxy") ||
    type.includes("tor") ||
    type.includes("socks");
  // Prefer explicit hosting/datacenter — "Business" alone is too noisy.
  const isDatacenter =
    type.includes("hosting") || type.includes("datacenter");

  if (isVpnOrProxy || isDatacenter) {
    return {
      ok: false,
      isVpnOrProxy,
      isDatacenter,
      provider: "proxycheck",
      reason: isVpnOrProxy
        ? "VPNs and proxies are not allowed. Please disconnect and try again."
        : "Datacenter / hosting IPs are not allowed. Please use a residential connection.",
    };
  }

  return {
    ok: true,
    isVpnOrProxy: false,
    isDatacenter: false,
    provider: "proxycheck",
  };
}

async function lookupIpApiIs(ip: string): Promise<IpReputationResult | null> {
  const data = await fetchJson(`https://api.ipapi.is?q=${encodeURIComponent(ip)}`);
  if (!data) return null;

  const isVpnOrProxy = Boolean(
    data.is_vpn || data.is_proxy || data.is_tor || data.is_abuser
  );
  const isDatacenter = Boolean(data.is_datacenter);

  if (isVpnOrProxy || isDatacenter) {
    return {
      ok: false,
      isVpnOrProxy,
      isDatacenter,
      provider: "ipapi.is",
      reason: isVpnOrProxy
        ? "VPNs and proxies are not allowed. Please disconnect and try again."
        : "Datacenter / hosting IPs are not allowed. Please use a residential connection.",
    };
  }

  return {
    ok: true,
    isVpnOrProxy: false,
    isDatacenter: false,
    provider: "ipapi.is",
  };
}

/**
 * Returns ok:false when the IP is a known VPN/proxy or datacenter.
 * Skips private/local IPs. Caches results ~30 minutes.
 */
export async function checkIpReputation(ip: string): Promise<IpReputationResult> {
  const trimmed = (ip || "").trim();

  if (isPrivateOrLocalIp(trimmed)) {
    return { ok: true, provider: "local" };
  }

  const cached = cache.get(trimmed);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  // Prefer HTTPS providers first; fall back to ip-api.
  const lookups: Array<() => Promise<IpReputationResult | null>> = [
    () => lookupIpApiIs(trimmed),
    () => lookupProxyCheck(trimmed),
    () => lookupIpApi(trimmed),
  ];

  let sawFailure = false;
  for (const run of lookups) {
    const result = await run();
    if (!result) {
      sawFailure = true;
      continue;
    }
    if (!result.ok) {
      cache.set(trimmed, { result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    }
    // Positive clean result from any provider is enough
    cache.set(trimmed, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  const fallback: IpReputationResult = isStrictMode()
    ? {
        ok: false,
        reason:
          "Could not verify your network. Disable VPN and try again from a residential connection.",
        provider: "none",
      }
    : {
        ok: true,
        provider: "none",
        reason: sawFailure ? "lookup-unavailable" : "lookup-unavailable",
      };

  cache.set(trimmed, { result: fallback, expiresAt: Date.now() + 5 * 60 * 1000 });
  return fallback;
}

/** Auth helper: skip for demo account, otherwise run IP reputation. */
export async function assertResidentialIp(opts: {
  ip: string;
  email?: string;
}): Promise<IpReputationResult> {
  const email = opts.email?.toLowerCase().trim();
  if (email && email === DEMO_ACCOUNT_EMAIL) {
    return { ok: true, provider: "demo" };
  }
  return checkIpReputation(opts.ip);
}

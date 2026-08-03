/**
 * Consumer email allowlist for signup / login.
 * Only Gmail, iCloud, Yahoo, and Outlook/Hotmail/Live families.
 */

import { DEMO_ACCOUNT_EMAIL } from "@/lib/captcha";

const EXACT_ALLOWED_DOMAINS = new Set([
  // Gmail
  "gmail.com",
  "googlemail.com",
  // iCloud / Apple
  "icloud.com",
  "me.com",
  "mac.com",
  // Yahoo
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.co.uk",
  "yahoo.ca",
  "yahoo.com.au",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.it",
  "yahoo.es",
  "yahoo.co.jp",
  "ymail.com",
  "rocketmail.com",
  // Outlook / Microsoft
  "outlook.com",
  "outlook.co.uk",
  "outlook.fr",
  "outlook.de",
  "outlook.in",
  "outlook.es",
  "outlook.it",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.de",
  "hotmail.it",
  "hotmail.es",
  "live.com",
  "live.co.uk",
  "msn.com",
]);

/** Regional Yahoo / Outlook style domains: yahoo.*, hotmail.*, outlook.*, live.* */
function matchesProviderPattern(domain: string): boolean {
  const parts = domain.split(".");
  if (parts.length < 2) return false;
  const brand = parts[0];
  return (
    brand === "yahoo" ||
    brand === "hotmail" ||
    brand === "outlook" ||
    brand === "live"
  );
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return domain || null;
}

/** True when the address is on an allowed consumer provider (or demo account). */
export function isAllowedEmailProvider(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  if (normalized === DEMO_ACCOUNT_EMAIL) return true;

  const domain = emailDomain(normalized);
  if (!domain) return false;
  if (EXACT_ALLOWED_DOMAINS.has(domain)) return true;
  return matchesProviderPattern(domain);
}

export const ALLOWED_EMAIL_HINT =
  "Use a Gmail, iCloud, Yahoo, or Outlook/Hotmail email address.";

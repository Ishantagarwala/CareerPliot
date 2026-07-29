/** Display hackathon prize strings with INR symbol instead of USD. */
export function formatHackathonPrize(prizes: string): string {
  if (!prizes) return prizes;
  return prizes
    .replace(/\$/g, "₹")
    .replace(/\sUSD\b/gi, "")
    .replace(/\bINR\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Format a job salary range with the INR (₹) symbol for display. */
export function formatJobSalary(salary: {
  min?: number;
  max?: number;
  currency?: string;
}): string {
  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const min = salary.min != null ? fmt(salary.min) : "";
  const max = salary.max != null ? fmt(salary.max) : "";

  if (min && max) return `₹${min} – ₹${max}`;
  if (min) return `₹${min}+`;
  if (max) return `Up to ₹${max}`;
  return "";
}

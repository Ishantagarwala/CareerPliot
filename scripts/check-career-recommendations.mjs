// Checks the career-assessment output filter against the shapes a model
// actually produces, including the ones that used to reach the database.
//
// Run: npm run check:career
import { compileLibModules } from "./lib/compile-for-node.mjs";

compileLibModules({
  tmp: ".tmp/career-check",
  outDir: "build",
  include: ["../../lib/career/**/*.ts"],
});

const { sanitizeRecommendations, isUsableCareerPath, normalizeMatchScore } = await import(
  "../.tmp/career-check/build/career/recommendations.js"
);

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

console.log("Career paths that are not careers");
for (const junk of [
  "Authentication failed",
  "Error: no API key configured",
  "undefined",
  "N/A",
  "Unknown",
  "{ recommendations: [] }",
  "Please provide more information",
  "API key invalid",
  "Rate limit exceeded",
  "Assistant",
  "Career Path",
  "",
  "   ",
  "a".repeat(120),
  null,
  42,
]) {
  check(`rejects ${JSON.stringify(String(junk).slice(0, 40))}`, !isUsableCareerPath(junk));
}

console.log("\nReal career titles");
for (const path of [
  "Registered Nurse (RN)",
  "Front-End Web Developer",
  "Esports Shoutcaster / Commentator",
  "Data Analyst",
  "Mechanical Design Engineer",
  "UX Researcher",
]) {
  check(`accepts ${path}`, isUsableCareerPath(path));
}

console.log("\nScore normalisation");
check("85 stays 85", normalizeMatchScore(85) === 85);
check('"85%" becomes 85', normalizeMatchScore("85%") === 85);
check("0.9 means 90", normalizeMatchScore(0.9) === 90);
check("a 10-point scale is not read as 9", normalizeMatchScore(9) === 9);
check("over 100 is clamped", normalizeMatchScore(140) === 100);
check("zero is floored to 1", normalizeMatchScore(0) === 1);
check("garbage becomes a default, not NaN", normalizeMatchScore("high") === 75);
check("null becomes a default", normalizeMatchScore(null) === 75);

console.log("\nFull payload filtering");
const mixed = sanitizeRecommendations([
  { careerPath: "Registered Nurse (RN)", matchScore: 95, reasoning: "Strong fit for your biology interest and hospital goal." },
  { careerPath: "Authentication failed", matchScore: 90, reasoning: "This is not a career at all but a system error message." },
  { careerPath: "  registered nurse (rn) ", matchScore: "88%", reasoning: "Same career as the first, differently written." },
  { careerPath: "Nurse Practitioner", matchScore: "85%", reasoning: "short" },
  { careerPath: "", matchScore: 70, reasoning: "Empty title should be dropped entirely." },
  { careerPath: "Health Informatics Specialist", matchScore: 120, reasoning: "Uses your analytical side and grows into hospital systems work." },
  null,
  "string entry",
]);
check("junk entries dropped", mixed.length === 3, `kept ${mixed.length}`);
check("duplicates collapsed", new Set(mixed.map((r) => r.careerPath.toLowerCase())).size === mixed.length);
check("string score parsed", mixed.some((r) => r.matchScore === 85));
check("over-range score clamped", mixed.some((r) => r.matchScore === 100));
check(
  "short reasoning replaced with something usable",
  mixed.every((r) => r.reasoning.length >= 20)
);
check(
  "sorted by match score",
  mixed.every((rec, index) => index === 0 || mixed[index - 1].matchScore >= rec.matchScore),
  mixed.map((r) => r.matchScore).join(",")
);
check("empty input yields nothing", sanitizeRecommendations([]).length === 0);
check("non-array input yields nothing", sanitizeRecommendations({ recommendations: [] }).length === 0);
check("undefined input yields nothing", sanitizeRecommendations(undefined).length === 0);

console.log("\nSomething usable survives a partially bad response");
const partial = sanitizeRecommendations([
  { careerPath: "Data Analyst", matchScore: 88, reasoning: "Matches your maths strength and interest in finding patterns in data." },
  { careerPath: "Rate limit exceeded", matchScore: 10, reasoning: "Not a career." },
]);
check("one good entry is kept", partial.length === 1 && partial[0].careerPath === "Data Analyst");

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

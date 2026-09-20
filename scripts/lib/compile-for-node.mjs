import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Compiles the pure document modules to `.tmp` so a check can import them in
 * plain Node.
 *
 * The writers under test contain no React and no DOM at import time, so they
 * need no bundler — only type stripping. Each check compiles its own copy, so
 * the checks have no ordering dependency on one another.
 */
export function compileLibModules({ tmp, outDir }) {
  mkdirSync(tmp, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    `${tmp}/tsconfig.json`,
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        lib: ["ES2022", "DOM"],
        strict: false,
        skipLibCheck: true,
        outDir,
        rootDir: "../../lib",
      },
      include: ["../../lib/export/**/*.ts", "../../lib/generated/**/*.ts"],
    })
  );
  execFileSync("npx", ["tsc", "-p", `${tmp}/tsconfig.json`], { stdio: "inherit" });
}

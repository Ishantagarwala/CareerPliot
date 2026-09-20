// Verifies the real rendering path for a generated-file block: the
// application's parser, then ReactMarkdown, against a captured reply.
//
// The fixture's shape is the point. Its document nests its own ``` code fences
// and a mermaid diagram, which is what broke the first implementation: a
// backtick fence around such a document is closed early by the inner fences,
// and the reply arrives as a paragraph of raw JSON. Hence the `~~~file` fence.
//
// Run: npm run check:files   (compiles lib/generated first — see check-docs)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { compileLibModules } from "./lib/compile-for-node.mjs";

// Self-contained: compiles the modules it imports, so the checks can run in any
// order.
compileLibModules({ tmp: ".tmp/file-check", outDir: "build" });

const { parseGeneratedFile } = await import("../.tmp/file-check/build/generated/fileSpec.js");

/*
 * A real reply, captured from the assistant, kept as a fixture because its
 * shape is the point: the document inside it nests its own ``` code fences and
 * a mermaid diagram, which is exactly what broke the first implementation.
 */
const reply = readFileSync("scripts/fixtures/generated-file-reply.md", "utf8");

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

console.log("Checking the fixture is representative");
const innerFences = (reply.match(/^\s*```/gm) || []).length;
console.log(`  fences in the reply: ${innerFences}`);
check("reply contains a file block", /^\s{0,3}(?:~~~|```)file\b/m.test(reply));
const nestedBackticks = (reply.match(/\\n\s*```/g) || []).length;
check(
  "the document nests its own backtick fences",
  nestedBackticks > 3,
  `found ${nestedBackticks}; the collision this contract avoids is untested without them`
);
check(
  "the outer fence uses tildes, which cannot collide",
  /^\s{0,3}~~~file\b/m.test(reply),
  "a backtick outer fence is what truncated real documents"
);

// ─── 1. A fence-aware scan (CommonMark rules), the way a reader works ────────
function extractFileBlock(source) {
  const lines = source.split("\n");
  let open = null;
  let collected = null;

  for (const line of lines) {
    const fence = line.match(/^(\s{0,3})(`{3,}|~{3,})\s*([\w-]*)\s*$/);
    if (!open && fence && fence[3].toLowerCase() === "file") {
      open = { char: fence[2][0], length: fence[2].length };
      collected = [];
      continue;
    }
    if (open) {
      /*
       * A closing fence may share a line with the JSON that precedes it, so a
       * fence run anywhere in the line ends the block, and whatever came before
       * it on that line stays part of the payload.
       */
      const close = line.match(/(`{3,}|~{3,})/);
      if (close && close[1][0] === open.char && close[1].length >= open.length) {
        const before = line.slice(0, close.index);
        if (before.trim()) collected.push(before);
        break;
      }
      collected.push(line);
    }
  }

  return collected ? collected.join("\n") : null;
}

const block = extractFileBlock(reply);
check("fence-aware scan extracts the block", Boolean(block));

/*
 * Parsed with the application's own parser, which is the thing under test: it
 * has to tolerate the trailing characters a model leaves around the JSON.
 */
const spec = block ? parseGeneratedFile(block) : null;
check("the application parses the block", Boolean(spec));
check(
  "payload with a trailing fence on the same line still parses",
  (() => {
    const payload = '{"filename":"x","markdown":"# Hi"}`' + '``';
    return parseGeneratedFile(payload)?.markdown === "# Hi";
  })()
);
if (spec) {
  console.log(
    `  filename: ${spec.filename} | format: ${spec.format} | markdown chars: ${spec.markdown.length}`
  );
  check("document is the full study guide", spec.markdown.length > 3000);
  check("document is not truncated", spec.markdown.trimEnd().split("\n").length > 20);
  check(
    "nested code fences survived extraction",
    spec.markdown.includes("```js"),
    "the document's own fences were lost or ended the block early"
  );
  check(
    "extraction did not run past the document",
    !spec.markdown.includes("~~~") && !/^\s*\]\}/m.test(spec.markdown)
  );
}

// ─── 2. The app's own parser, through ReactMarkdown, in a real DOM ───────────
import { parseHTML } from "linkedom";
const { document, window } = parseHTML("<html><body></body></html>");
globalThis.document = document;
globalThis.window = window;
globalThis.Node = globalThis.Node || { ELEMENT_NODE: 1, TEXT_NODE: 3 };

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const ReactMarkdown = (await import("react-markdown")).default;
const remarkGfm = (await import("remark-gfm")).default;
// Mirrors MarkdownContent's `code` handler: a parsed spec renders the card,
// which the test stands in for with a marker div.
const Json = React.createElement;
const components = {
  code: ({ className, children }) => {
    const match = /language-(\w+)/.exec(className || "");
    const code = String(children).replace(/\n$/, "");
    if (match?.[1]?.toLowerCase() === "file") {
      const parsed = parseGeneratedFile(code);
      if (parsed) {
        return Json("div", { "data-generated-file": `${parsed.filename}.${parsed.format}` }, parsed.title);
      }
    }
    return Json("pre", null, Json("code", { className }, children));
  },
  pre: ({ children }) => Json(React.Fragment, null, children),
};

const html = renderToStaticMarkup(
  Json(ReactMarkdown, { remarkPlugins: [remarkGfm], components }, reply)
);

mkdirSync(".tmp/export-out", { recursive: true });
writeFileSync(".tmp/export-out/reply-render.html", html);

check("ReactMarkdown turns the block into a file card", html.includes("data-generated-file="));
const card = html.match(/data-generated-file="([^"]+)"/)?.[1];
check("card names the right file", Boolean(card && card.endsWith(".pdf") || card?.endsWith(".docx")), card);
check(
  "the raw file JSON is not rendered as code",
  !html.includes("&quot;filename&quot;:&quot;js-closures")
);
check("nested fences did not leak into the outer block", !/```/.test(html.replace(/<[^>]+>/g, "")));
check("the reply's prose is rendered", html.includes("printable PDF study guide"));
check("nested fences did not split the block", (html.match(/data-generated-file=/g) || []).length === 1);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

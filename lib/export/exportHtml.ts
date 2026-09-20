import type { ExportBlock, ExportDocument, Inline } from "./markdownBlocks";

/**
 * Standalone HTML for the browser's own "Save as PDF".
 *
 * Using the print pipeline instead of a canvas library means the PDF keeps real
 * selectable text, correct page breaks through code blocks and tables, and
 * vector output — the same reasons the browser's own print-to-PDF beats a
 * screenshot. The page carries its own stylesheet because it is opened in a
 * bare window with no access to the app's CSS.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineHtml(runs: Inline[]): string {
  return runs
    .map((run) => {
      if (run.kind === "link") {
        return `<a href="${escapeHtml(run.href)}">${inlineHtml(run.runs)}</a>`;
      }
      /*
       * `<br>` in the rendered reply marks a hard line break the author asked
       * for, which a printed page should keep — so no trimming here. Whitespace
       * *between* inline elements is meaningful text and is left untouched.
       */
      let html = escapeHtml(run.text.replace(/\s*\n\s*/g, " "));
      if (run.code) html = `<code>${html}</code>`;
      if (run.bold) html = `<strong>${html}</strong>`;
      if (run.italic) html = `<em>${html}</em>`;
      if (run.strike) html = `<s>${html}</s>`;
      return html;
    })
    .join("");
}

/**
 * Inlines a serialised diagram.
 *
 * The markup is produced by the app itself from a mermaid definition, never
 * from model output, so it is trusted here — but it still must not be able to
 * carry a script into the print window, hence the `on*` and `<script>` strip.
 */
function inlineSvg(markup?: string): string {
  if (!markup) return "";
  return markup
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function blocksHtml(blocks: ExportBlock[]): string {
  const out: string[] = [];

  for (const block of blocks) {
    switch (block.kind) {
      case "heading": {
        const level = Math.min(block.level + 1, 6);
        out.push(`<h${level}>${inlineHtml(block.runs)}</h${level}>`);
        break;
      }
      case "paragraph":
        out.push(`<p>${inlineHtml(block.runs)}</p>`);
        break;

      case "list": {
        /*
         * Nested lists are flattened with an indent rather than reconstructed
         * as nested <ul>s: the model already carries a `level`, and rebuilding
         * the tree from a flat list is a reliable source of stray tags for no
         * visual gain on a printed page.
         */
        const tag = block.ordered ? "ol" : "ul";
        const items = block.items
          .map((item) => {
            const pad = item.level > 0 ? ` style="margin-left:${item.level * 18}px"` : "";
            return `<li${pad}>${inlineHtml(item.runs)}</li>`;
          })
          .join("");
        out.push(`<${tag}>${items}</${tag}>`);
        break;
      }

      case "code":
        out.push(
          `<div class="code"><div class="code-head">${escapeHtml(
            block.language || "code"
          )}</div><pre>${escapeHtml(block.text)}</pre></div>`
        );
        break;

      case "quote":
        out.push(`<blockquote>${inlineHtml(block.runs)}</blockquote>`);
        break;

      case "table": {
        const rows = block.rows
          .map((row) => {
            const cells = row
              .map((cell) => {
                const tag = cell.header ? "th" : "td";
                const span = cell.colSpan && cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : "";
                const body = cell.paragraphs
                  .map((paragraph) => inlineHtml(paragraph))
                  .join("<br>");
                return `<${tag}${span}>${body}</${tag}>`;
              })
              .join("");
            return `<tr>${cells}</tr>`;
          })
          .join("");
        out.push(`<table>${rows}</table>`);
        break;
      }

      case "image":
        /*
         * Vector first: a printed PDF keeps the diagram sharp and re-renderable
         * when it is inlined, and inlining also avoids the isolated SVG
         * document an <img> data URL would create. The raster is the fallback
         * for a diagram the print pipeline cannot serialise.
         */
        out.push(
          block.image.svg
            ? `<figure class="diagram">${inlineSvg(block.image.svg)}</figure>`
            : `<figure class="diagram"><img src="${block.image.dataUrl}" alt="${escapeHtml(
                block.image.caption || "Diagram"
              )}" style="max-width:${Math.min(block.image.widthPx, 720)}px"></figure>`
        );
        break;

      case "chart": {
        const rows = block.chart.rows
          .map(
            (row) =>
              `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`
          )
          .join("");
        out.push(
          `<figure class="chart"><figcaption>${escapeHtml(
            block.chart.caption || "Chart data"
          )}</figcaption><table>${rows}</table></figure>`
        );
        break;
      }

      case "rule":
        out.push("<hr>");
        break;
    }
  }

  return out.join("\n");
}

const PRINT_CSS = `
  @page { size: A4; margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #15171b;
    background: #fff;
    font: 15px/1.65 "Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { max-width: 760px; margin: 0 auto; padding: 28px 24px 40px; }
  header { border-bottom: 2px solid #15171b; padding-bottom: 12px; margin-bottom: 22px; }
  header h1 { font-size: 21px; margin: 0 0 6px; letter-spacing: -0.01em; }
  header .meta { font-size: 12px; color: #6b7280; }
  header .brand { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
  h2 { font-size: 19px; margin: 26px 0 10px; }
  h3 { font-size: 17px; margin: 22px 0 8px; }
  h4, h5, h6 { font-size: 15px; margin: 18px 0 6px; }
  p { margin: 0 0 11px; }
  ul, ol { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 5px; }
  a { color: #1b4dd8; text-decoration: underline; word-break: break-word; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  code {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12.5px;
    background: #f2f3f6;
    border: 1px solid #e2e4ea;
    border-radius: 3px;
    padding: 1px 4px;
  }
  .code { border: 1px solid #262626; border-radius: 6px; overflow: hidden; margin: 14px 0; break-inside: avoid; }
  .code-head {
    background: #131313; color: #8e9192; font-size: 10px; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 5px 10px;
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  .code pre {
    margin: 0; padding: 12px 14px; background: #0A0A0A; color: #c4c7c8;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-word;
  }
  blockquote {
    margin: 14px 0; padding: 2px 0 2px 14px; border-left: 3px solid #d5d8e0; color: #4b5563; font-style: italic;
  }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13.5px; }
  th, td { border: 1px solid #d9dce3; padding: 7px 9px; text-align: left; vertical-align: top; }
  th { background: #f4f5f8; font-weight: 700; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  hr { border: 0; border-top: 1px solid #e2e4ea; margin: 20px 0; }
  .diagram { margin: 16px 0; text-align: center; break-inside: avoid; }
  .diagram img { max-width: 100%; height: auto; }
  .chart { margin: 16px 0; break-inside: avoid; }
  .chart figcaption { font-size: 12px; font-weight: 700; color: #4b5563; margin-bottom: 6px; }

  /* The screen shows a compact toolbar; a printed page does not need one. */
  @media print {
    .sheet { padding: 0; max-width: none; }
    .code { border-color: #333; }
  }
`;

export function buildExportHtml(doc: ExportDocument): string {
  const meta = doc.meta ? `<div class="meta">${escapeHtml(doc.meta)}</div>` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(doc.title)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
<main class="sheet">
<header>
<div class="brand">CareerPilot · AI Study Hub</div>
<h1>${escapeHtml(doc.title)}</h1>
${meta}
</header>
${blocksHtml(doc.blocks)}
</main>
</body>
</html>`;
}

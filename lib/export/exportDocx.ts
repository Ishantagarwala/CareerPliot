import type { ExportBlock, ExportDocument, Inline, TableCell } from "./markdownBlocks";

/**
 * A real `.docx` writer, with no dependency added for it.
 *
 * A `.docx` is a ZIP of XML parts. Word refuses (and silently corrupts) an HTML
 * file renamed to `.docx`, and shipping a document library for one button is
 * more weight than the feature is worth — so the ZIP is assembled here. Entries
 * are STORE'd, which is valid for OOXML and keeps the writer synchronous and
 * indexable with no streaming state.
 */

// ─── ZIP ─────────────────────────────────────────────────────────────────────

/** Standard CRC-32, computed lazily once per table entry. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Minimal base64 decoder — `atob` needs a binary string, which mangles UTF-8. */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

interface ZipEntry {
  name: Uint8Array;
  data: Uint8Array;
  crc: number;
  offset: number;
}

function zipStore(
  files: Array<{ name: string; content: string }>,
  binary: Array<{ name: string; content: string }> = []
): Blob {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [];
  const chunks: Uint8Array[] = [];
  let offset = 0;

  const push = (name: string, data: Uint8Array) => {
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0x0800, true); // UTF-8 filenames
    view.setUint16(8, 0, true); // STORE
    view.setUint16(10, 0, true); // time
    view.setUint16(12, 0x21, true); // date (1980-01-01)
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    entries.push({ name: nameBytes, data, crc, offset });
    chunks.push(local, data);
    offset += local.length + data.length;
  };

  for (const file of files) push(file.name, encoder.encode(file.content));
  for (const file of binary) push(file.name, base64ToBytes(file.content));

  const directory: Uint8Array[] = [];
  const dirStart = offset;

  for (const entry of entries) {
    const record = new Uint8Array(46 + entry.name.length);
    const view = new DataView(record.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true); // version made by
    view.setUint16(6, 20, true); // version needed
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0x21, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.data.length, true);
    view.setUint32(24, entry.data.length, true);
    view.setUint16(28, entry.name.length, true);
    view.setUint32(42, entry.offset, true);
    record.set(entry.name, 46);
    directory.push(record);
    offset += record.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, offset - dirStart, true);
  endView.setUint32(16, dirStart, true);

  return new Blob([...chunks, ...directory, end].map((part) => part.slice()), {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

// ─── OOXML ───────────────────────────────────────────────────────────────────

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** XML 1.0 forbids most control characters — strip rather than emit bad XML. */
function clean(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function esc(text: string): string {
  return clean(text).replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);
}

function attr(text: string): string {
  return esc(text).replace(/\n/g, "&#10;");
}

interface RunOptions {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: boolean;
}

function run(text: string, options: RunOptions = {}): string {
  // A run cannot contain a literal newline: Word treats it as a break.
  const parts = clean(text).split("\n");
  const pieces = parts
    .map((part, index) => {
      const br = index > 0 ? "<w:br/>" : "";
      if (!part && !br) return "";
      return `${br}<w:t xml:space="preserve">${esc(part)}</w:t>`;
    })
    .join("");

  const props: string[] = [];
  if (options.code) props.push('<w:rStyle w:val="CodeChar"/>');
  if (options.bold) props.push("<w:b/>");
  if (options.italic) props.push("<w:i/>");
  if (options.strike) props.push("<w:strike/>");
  if (options.link) props.push('<w:color w:val="1B4DD8"/><w:u w:val="single"/>');

  const rPr = props.length ? `<w:rPr>${props.join("")}</w:rPr>` : "";
  return `<w:r>${rPr}${pieces}</w:r>`;
}

function runsXml(runs: Inline[]): string {
  return runs
    .map((item) => {
      if (item.kind === "link") {
        const id = hyperlinkId(item.href);
        const inner = item.runs.map((r) => run(r.text, { ...r, link: true })).join("");
        return `<w:hyperlink r:id="${id}" w:history="1">${inner}</w:hyperlink>`;
      }
      return run(item.text, {
        bold: item.bold,
        italic: item.italic,
        strike: item.strike,
        code: item.code,
      });
    })
    .join("");
}

function paragraph(
  content: string,
  options: { style?: string; align?: string; indent?: number; space?: number } = {}
): string {
  const props: string[] = [];
  if (options.style) props.push(`<w:pStyle w:val="${options.style}"/>`);
  if (options.indent) props.push(`<w:ind w:left="${options.indent}"/>`);
  if (options.align) props.push(`<w:jc w:val="${options.align}"/>`);
  if (options.space !== undefined) {
    props.push(`<w:spacing w:before="${options.space}" w:after="${options.space}"/>`);
  }

  const pPr = props.length ? `<w:pPr>${props.join("")}</w:pPr>` : "";
  return `<w:p>${pPr}${content}</w:p>`;
}

// ─── Relationships (hyperlinks are late-bound) ───────────────────────────────

let linkTargets: string[] = [];
let linkIndex = new Map<string, number>();

function hyperlinkId(href: string): string {
  const existing = linkIndex.get(href);
  if (existing !== undefined) return `rIdLink${existing}`;
  linkTargets.push(href);
  const id = linkTargets.length;
  linkIndex.set(href, id);
  return `rIdLink${id}`;
}

// ─── Block rendering ─────────────────────────────────────────────────────────

const EMU_PER_PX = 9525;

/**
 * An inline picture. Kept to the exact element/namespace shape Word and
 * LibreOffice accept: `a:` and `pic:` are declared once on the document root,
 * and re-declaring them here makes LibreOffice drop the picture silently.
 */
function imageParagraph(block: Extract<ExportBlock, { kind: "image" }>): string {
  const { dataUrl, widthPx, heightPx, caption } = block.image;

  /*
   * Word cannot draw an SVG, and a diagram that failed to rasterise has no PNG
   * to embed. Name it rather than dropping it, so the reader knows something
   * was there and can open the PDF export for the visual.
   */
  if (!dataUrl) {
    return paragraph(
      run(`${caption || "Diagram"} — see the PDF or web version for the rendered diagram.`, {
        italic: true,
      }),
      { style: "Caption", align: "center" }
    );
  }

  const base64 = dataUrl.split(",")[1] || "";
  const id = drawingId();
  drawings.set(id, base64);

  // Fit the text column (about 600px at A4 with 2cm margins) without upscaling.
  const maxWidthPx = 600;
  const scale = widthPx > maxWidthPx ? maxWidthPx / widthPx : 1;
  const width = Math.max(1, Math.round(widthPx * scale)) * EMU_PER_PX;
  const height = Math.max(1, Math.round(heightPx * scale)) * EMU_PER_PX;

  const drawing = `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
<wp:extent cx="${width}" cy="${height}"/>
<wp:docPr id="${id}" name="Diagram ${id}"/>
<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic>
<pic:nvPicPr><pic:cNvPr id="${id}" name="diagram${id}.png"/><pic:cNvPicPr/></pic:nvPicPr>
<pic:blipFill><a:blip r:embed="rIdImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;

  const captionXml = caption
    ? paragraph(run(caption, { italic: true }), { style: "Caption", align: "center" })
    : "";

  // The drawing must sit inside a run: `<w:p><w:pPr/><w:drawing>` parses as
  // XML but is not a valid paragraph, and readers drop the picture silently.
  return paragraph(`<w:r>${drawing}</w:r>`, { align: "center" }) + captionXml;
}

let drawingCounter = 0;
const drawings = new Map<number, string>();

function drawingId(): number {
  drawingCounter += 1;
  return drawingCounter;
}

function tableXml(rows: TableCell[][]): string {
  const columnCount = Math.max(...rows.map((row) => row.length));
  const totalWidth = 9020; // A4 minus 2cm margins, in twips
  const cellWidth = Math.floor(totalWidth / Math.max(1, columnCount));

  const grid = Array.from({ length: columnCount }, () => `<w:gridCol w:w="${cellWidth}"/>`).join("");

  const body = rows
    .map((row) => {
      const cells = row
        .map((cell) => {
          const span = cell.colSpan && cell.colSpan > 1 ? `<w:gridSpan w:val="${cell.colSpan}"/>` : "";
          const shading = cell.header
            ? '<w:shd w:val="clear" w:color="auto" w:fill="F4F5F8"/>'
            : "";
          const paragraphs = cell.paragraphs
            .map((runs) => paragraph(runsXml(runs), { style: cell.header ? "TableHead" : undefined }))
            .join("");
          return `<w:tc><w:tcPr><w:tcW w:w="${cellWidth}" w:type="dxa"/>${span}${shading}</w:tcPr>${paragraphs}</w:tc>`;
        })
        .join("");
      return `<w:tr>${cells}</w:tr>`;
    })
    .join("");

  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${totalWidth}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>${paragraph("", { space: 120 })}`;
}

function blocksXml(blocks: ExportBlock[]): string {
  const out: string[] = [];

  for (const block of blocks) {
    switch (block.kind) {
      case "heading": {
        const level = Math.min(block.level, 4);
        out.push(paragraph(runsXml(block.runs), { style: `Heading${level}` }));
        break;
      }

      case "paragraph":
        out.push(paragraph(runsXml(block.runs)));
        break;

      case "list": {
        const numbered = new Map<number, number>();
        for (const item of block.items) {
          const level = Math.min(item.level, 4);
          const marker = block.ordered ? `${(numbered.get(level) || 0) + 1}. ` : "• ";
          numbered.set(level, (numbered.get(level) || 0) + 1);
          out.push(
            paragraph(
              run(marker) + runsXml(item.runs),
              { indent: 360 + level * 360 }
            )
          );
        }
        break;
      }

      case "code": {
        if (block.language) {
          out.push(paragraph(run(block.language.toUpperCase(), { code: true, bold: true }), { style: "CodeBlock" }));
        }
        block.text.split("\n").forEach((line) => {
          out.push(paragraph(run(line || " ", { code: true }), { style: "CodeBlock" }));
        });
        break;
      }

      case "quote":
        out.push(paragraph(runsXml(block.runs), { style: "Quote" }));
        break;

      case "table":
        out.push(tableXml(block.rows));
        break;

      case "image":
        out.push(imageParagraph(block));
        break;

      case "chart": {
        out.push(
          paragraph(run(block.chart.caption || "Chart data", { bold: true }), { style: "Heading3" })
        );
        const head: TableCell[] = [
          { paragraphs: [[{ kind: "text", text: "Label" }]], header: true },
          { paragraphs: [[{ kind: "text", text: "Value" }]], header: true },
        ];
        const body: TableCell[][] = block.chart.rows.map((row) => [
          { paragraphs: [[{ kind: "text", text: row.label }]] },
          { paragraphs: [[{ kind: "text", text: row.value }]] },
        ]);
        out.push(tableXml([head, ...body]));
        break;
      }

      case "rule":
        out.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D9DCE3"/></w:pBdr></w:pPr></w:p>');
        break;
    }
  }

  return out.join("");
}

// ─── Package parts ───────────────────────────────────────────────────────────

function contentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function rootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function documentRelsXml(): string {
  const links = linkTargets
    .map(
      (href, index) =>
        `<Relationship Id="rIdLink${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${attr(
          href
        )}" TargetMode="External"/>`
    )
    .join("");

  const images = Array.from(drawings.entries())
    .map(
      ([id]) =>
        `<Relationship Id="rIdImg${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/diagram${id}.png"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
${links}${images}
</Relationships>`;
}

/**
 * Built-in Word styles are deliberately relied on where possible
 * (`TableGrid`, `Caption`) so the file opens with sensible formatting even if a
 * reader ignores custom styles.
 */
function stylesXml(): string {
  const heading = (level: number, size: number, before: number, after: number) => `
<w:style w:type="paragraph" w:styleId="Heading${level}">
<w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:pPr><w:spacing w:before="${before}" w:after="${after}"/><w:keepNext/></w:pPr>
<w:rPr><w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/><w:b/><w:color w:val="15171B"/><w:sz w:val="${size}"/></w:rPr>
</w:style>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/>
</w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
${heading(1, 36, 240, 120)}
${heading(2, 30, 220, 100)}
${heading(3, 26, 200, 80)}
${heading(4, 23, 180, 60)}
<w:style w:type="paragraph" w:styleId="Caption">
<w:name w:val="Caption"/><w:basedOn w:val="Normal"/>
<w:rPr><w:i/><w:color w:val="6B7280"/><w:sz w:val="18"/></w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="Quote">
<w:name w:val="Quote"/><w:basedOn w:val="Normal"/>
<w:pPr><w:ind w:left="360"/></w:pPr>
<w:rPr><w:i/><w:color w:val="4B5563"/></w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="CodeBlock">
<w:name w:val="Code Block"/><w:basedOn w:val="Normal"/>
<w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F4F5F8"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="120"/></w:pPr>
<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="18"/></w:rPr>
</w:style>
<w:style w:type="character" w:styleId="CodeChar">
<w:name w:val="Code Char"/>
<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/><w:color w:val="B03060"/></w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="TableHead">
<w:name w:val="Table Head"/><w:basedOn w:val="Normal"/>
<w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:b/></w:rPr>
</w:style>
<w:style w:type="table" w:styleId="TableGrid">
<w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/>
<w:tblPr><w:tblBorders>
<w:top w:val="single" w:sz="4" w:space="0" w:color="D9DCE3"/>
<w:left w:val="single" w:sz="4" w:space="0" w:color="D9DCE3"/>
<w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9DCE3"/>
<w:right w:val="single" w:sz="4" w:space="0" w:color="D9DCE3"/>
<w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9DCE3"/>
<w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9DCE3"/>
</w:tblBorders></w:tblPr>
</w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal">
<w:name w:val="Normal Table"/><w:semiHidden/><w:unhideWhenUsed/>
</w:style>
</w:styles>`;
}

function coreXml(doc: ExportDocument): string {
  const created = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(doc.title)}</dc:title>
<dc:creator>CareerPilot</dc:creator>
<cp:lastModifiedBy>CareerPilot</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>
</cp:coreProperties>`;
}

function appXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>CareerPilot</Application>
</Properties>`;
}

function documentXml(doc: ExportDocument): string {
  const header = paragraph(run(doc.title, { bold: true }), { style: "Heading1" });
  const meta = doc.meta
    ? paragraph(run(doc.meta, { italic: true }), { style: "Caption" })
    : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>
${header}${meta}
${blocksXml(doc.blocks)}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
</w:body>
</w:document>`;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Builds the `.docx`. Link and image relationships are discovered while the
 * document body is rendered, so the body must be serialised before the
 * relationship parts that describe it.
 */
export function buildDocxBlob(doc: ExportDocument): Blob {
  linkTargets = [];
  linkIndex = new Map();
  drawings.clear();
  drawingCounter = 0;

  // Rendering the body is what discovers the hyperlink targets and embedded
  // pictures, so it must happen before the relationship parts are written.
  const body = documentXml(doc);

  const files: Array<{ name: string; content: string }> = [
    { name: "[Content_Types].xml", content: contentTypesXml() },
    { name: "_rels/.rels", content: rootRelsXml() },
    { name: "word/document.xml", content: body },
    { name: "word/styles.xml", content: stylesXml() },
    { name: "word/_rels/document.xml.rels", content: documentRelsXml() },
    { name: "docProps/core.xml", content: coreXml(doc) },
    { name: "docProps/app.xml", content: appXml() },
  ];

  const media = Array.from(drawings.entries()).map(([id, base64]) => ({
    name: `word/media/diagram${id}.png`,
    content: base64,
  }));

  return zipStore(files, media);
}

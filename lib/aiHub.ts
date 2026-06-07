interface ContextDocument {
  filename: string;
  summary?: string;
  contentText?: string;
}

const MAX_DOCUMENT_CONTEXT_CHARS = 12000;

export function buildDocumentContext(documents: ContextDocument[]): string {
  if (documents.length === 0) {
    return "";
  }

  let remaining = MAX_DOCUMENT_CONTEXT_CHARS;
  const sections: string[] = [];

  for (const doc of documents) {
    if (remaining <= 0) {
      break;
    }

    const sourceText = (doc.contentText || doc.summary || "").trim();
    if (!sourceText) {
      continue;
    }

    const excerpt = sourceText.slice(0, remaining);
    remaining -= excerpt.length;

    sections.push(`Document: ${doc.filename}\n${excerpt}`);
  }

  if (sections.length === 0) {
    return "";
  }

  return `Use the following uploaded study document context when it is relevant. If the answer is not in the documents, say so and answer from general knowledge only when appropriate.\n\n${sections.join("\n\n---\n\n")}`;
}

export function buildAiHubSystemPrompt(careerContext: string, documentContext: string): string {
  return `You are a professional, encouraging, and highly knowledgeable AI Study Hub for "Career Pilot".
Your role is to help students learn technical topics, understand uploaded notes, generate study plans, and prepare for careers.
${careerContext}
${documentContext ? `\nDocument context:\n${documentContext}` : ""}

Guidelines:
- Explain complex concepts simply using analogies, bullet points, and clean structures.
- When document context is available, cite the document filename naturally in your explanation.
- For summary or quiz requests, produce clear Markdown with headings and actionable study material.
- For coding questions, provide clean, well-commented code blocks.
- Keep responses engaging, structured, and easy to read using Markdown.`;
}

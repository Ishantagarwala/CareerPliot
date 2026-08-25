export interface HubDocument {
  _id?: string;
  id?: string;
  docId?: string;
  filename: string;
  fileUrl?: string;
  summary?: string;
  createdAt?: string;
}

export interface HubThread {
  _id: string;
  threadTitle?: string;
  threadType?: "general" | "document";
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatAttachment {
  type: "pdf" | "image";
  filename: string;
  fileUrl: string;
  docId?: string;
}

export function getDocumentId(document: Partial<HubDocument>): string | null {
  const id = document._id || document.id || document.docId;
  return typeof id === "string" && id ? id : null;
}

export function parseChatAttachment(value: unknown): ChatAttachment | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  if (candidate.type !== "pdf" && candidate.type !== "image") return null;
  if (
    typeof candidate.filename !== "string" ||
    !candidate.filename.trim() ||
    typeof candidate.fileUrl !== "string" ||
    !candidate.fileUrl.startsWith("/api/uploads/")
  ) {
    return null;
  }

  const docId =
    typeof candidate.docId === "string" && candidate.docId
      ? candidate.docId
      : undefined;
  if (candidate.type === "pdf" && !docId) return null;

  return {
    type: candidate.type,
    filename: candidate.filename.trim().slice(0, 200),
    fileUrl: candidate.fileUrl,
    docId,
  };
}

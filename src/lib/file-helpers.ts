import * as driveService from "@/services/drive";

export type SortField = "name" | "date" | "size" | "type";
export type SortDir = "asc" | "desc";

export const SORT_LABELS: Record<SortField, string> = {
  name: "Name",
  date: "Date",
  size: "Size",
  type: "Type",
};

export function canPreviewInline(mimeType: string | null): boolean {
  const t = mimeType ?? "";
  if (t.startsWith("image/") || t === "application/pdf") return true;
  if (t.startsWith("video/") || t.startsWith("audio/")) return true;
  if (driveService.PREVIEWABLE_WORKSPACE_TYPES.has(t)) return true;
  return false;
}

export function isSpreadsheet(mimeType: string | null): boolean {
  return mimeType === "application/vnd.google-apps.spreadsheet";
}

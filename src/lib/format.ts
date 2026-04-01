export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getMimeIcon(mimeType: string | null): string {
  const t = mimeType ?? "";
  if (t === "application/vnd.google-apps.folder") return "folder";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "music";
  if (t.includes("pdf")) return "file-text";
  if (t.includes("spreadsheet") || t.includes("sheet")) return "table";
  if (t.includes("presentation") || t.includes("slide")) return "presentation";
  if (t.includes("document") || t.startsWith("text/")) return "file-text";
  if (t.includes("zip") || t.includes("compressed")) return "archive";
  return "file";
}

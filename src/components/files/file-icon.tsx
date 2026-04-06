import {
  FolderOpen,
  File,
  Image,
  Video,
  Music,
  FileText,
  Table,
  Archive,
} from "lucide-react";

export function FileIcon({ mimeType }: { mimeType: string | null }) {
  const t = mimeType ?? "";
  if (t === "application/vnd.google-apps.folder")
    return <FolderOpen className="h-5 w-5 text-blue-400" />;
  if (t.startsWith("image/"))
    // eslint-disable-next-line jsx-a11y/alt-text -- lucide-react icon, not <img>
    return <Image className="h-5 w-5 text-green-400" />;
  if (t.startsWith("video/"))
    return <Video className="h-5 w-5 text-purple-400" />;
  if (t.startsWith("audio/"))
    return <Music className="h-5 w-5 text-pink-400" />;
  if (t.includes("pdf") || t.includes("document") || t.startsWith("text/"))
    return <FileText className="h-5 w-5 text-orange-400" />;
  if (t.includes("spreadsheet") || t.includes("sheet"))
    return <Table className="h-5 w-5 text-emerald-400" />;
  if (t.includes("zip") || t.includes("compressed"))
    return <Archive className="h-5 w-5 text-yellow-400" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

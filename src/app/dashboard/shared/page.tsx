"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useDrive } from "@/hooks/useDrive";
import * as driveService from "@/services/drive";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  File,
  FolderOpen,
  Image,
  Video,
  Music,
  FileText,
  Table,
  Archive,
  MoreVertical,
  Eye,
  ExternalLink,
  Download,
  X,
  Loader2,
} from "lucide-react";
import type { FileMetadata } from "@/types";

function FileIcon({ mimeType }: { mimeType: string | null }) {
  const t = mimeType ?? "";
  if (t === "application/vnd.google-apps.folder")
    return <FolderOpen className="h-5 w-5 text-blue-400" />;
  if (t.startsWith("image/"))
    // eslint-disable-next-line jsx-a11y/alt-text
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

function canPreviewInline(mimeType: string | null): boolean {
  const t = mimeType ?? "";
  if (t.startsWith("image/") || t === "application/pdf") return true;
  if (t.startsWith("video/") || t.startsWith("audio/")) return true;
  if (driveService.PREVIEWABLE_WORKSPACE_TYPES.has(t)) return true;
  return false;
}

function isSpreadsheet(mimeType: string | null): boolean {
  return mimeType === "application/vnd.google-apps.spreadsheet";
}

export default function SharedPage() {
  const { accounts, getToken } = useAccounts();
  const {
    openFile,
    getPreviewBlobUrl,
    getExportBlobUrl,
    getDownloadUrl,
  } = useDrive();

  const [files, setFiles] = useState<
    (FileMetadata & { sharedBy: string | null })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Preview state
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length === 0) return;

    const loadShared = async () => {
      setIsLoading(true);
      const allShared: (FileMetadata & { sharedBy: string | null })[] = [];

      for (const account of accounts) {
        try {
          const token = await getToken(account.email);
          const shared = await driveService.listSharedFiles(token, account.email);
          allShared.push(...shared);
        } catch (err) {
          console.warn(`Failed to load shared files for ${account.email}:`, err);
        }
      }

      setFiles(allShared);
      setIsLoading(false);
    };

    loadShared();
  }, [accounts, getToken]);

  // Cleanup blob URL when preview closes
  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  const closePreview = useCallback(() => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewFile(null);
    setPreviewBlobUrl(null);
    setPreviewLoading(false);
    setPreviewError(null);
  }, [previewBlobUrl]);

  const handleOpenFile = async (file: FileMetadata) => {
    // Spreadsheets → open directly in Google Sheets
    if (isSpreadsheet(file.mimeType)) {
      try {
        const url = await openFile(file);
        window.open(url, "_blank", "noopener");
      } catch (err) {
        toast.error("Failed to open spreadsheet", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
      return;
    }
    // Docs/Presentations/Drawings → export as PDF for inline preview
    if (driveService.PREVIEWABLE_WORKSPACE_TYPES.has(file.mimeType ?? "")) {
      setPreviewFile(file);
      setPreviewBlobUrl(null);
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const blobUrl = await getExportBlobUrl(file);
        setPreviewBlobUrl(blobUrl);
      } catch (err) {
        setPreviewError(
          err instanceof Error ? err.message : "Failed to load preview",
        );
      } finally {
        setPreviewLoading(false);
      }
      return;
    }
    // Other Google Workspace files → open in Google
    if (driveService.isGoogleWorkspaceFile(file.mimeType)) {
      try {
        const url = await openFile(file);
        window.open(url, "_blank", "noopener");
      } catch (err) {
        toast.error("Failed to open file", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
      return;
    }
    // Images and PDFs → blob preview
    if (canPreviewInline(file.mimeType)) {
      setPreviewFile(file);
      setPreviewBlobUrl(null);
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const blobUrl = await getPreviewBlobUrl(file);
        setPreviewBlobUrl(blobUrl);
      } catch (err) {
        setPreviewError(
          err instanceof Error ? err.message : "Failed to load preview",
        );
      } finally {
        setPreviewLoading(false);
      }
      return;
    }
    // Everything else → download
    handleDownload(file);
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      const url = await getDownloadUrl(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      toast.error("Failed to download", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shared with Me</h1>
        <p className="text-muted-foreground">
          Files and folders others have shared with your accounts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Shared Files
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading..."
              : `${files.length} shared file${files.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Share2 className="h-12 w-12 mb-4" />
              <p className="text-lg">No shared files</p>
              <p className="text-sm mt-1">
                Files shared with your accounts will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {files.map((file) => (
                <div
                  key={`${file.accountEmail}-${file.driveFileId}`}
                  className="flex items-center gap-3 py-3 hover:bg-accent transition-colors group cursor-pointer px-2 -mx-2 rounded"
                  onClick={() => handleOpenFile(file)}
                >
                  <FileIcon mimeType={file.mimeType} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {file.fileName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        via {file.accountEmail}
                      </span>
                      {file.sharedBy && (
                        <Badge variant="secondary" className="text-[10px]">
                          from {file.sharedBy}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {formatBytes(file.size)}
                  </span>
                  <span className="hidden text-xs text-muted-foreground md:block">
                    {formatDate(file.createdAt)}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        }
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenFile(file)}>
                          {canPreviewInline(file.mimeType) ? (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </>
                          ) : driveService.isGoogleWorkspaceFile(file.mimeType) ? (
                            <>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open in Google
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Open
                            </>
                          )}
                        </DropdownMenuItem>
                        {!driveService.isGoogleWorkspaceFile(file.mimeType) && (
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Preview Dialog */}
      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent className="max-w-[90vw]! w-full max-h-[92vh] h-[92vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="truncate pr-8 text-lg">
                {previewFile?.fileName}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-muted/30 relative">
            {previewLoading && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading preview…</p>
              </div>
            )}

            {previewError && !previewLoading && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <X className="h-7 w-7 text-destructive" />
                </div>
                <p className="text-sm font-medium">Could not load preview</p>
                <p className="text-xs max-w-md">{previewError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    if (previewFile) handleOpenFile(previewFile);
                  }}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Image preview */}
            {!previewLoading &&
              !previewError &&
              previewBlobUrl &&
              previewFile?.mimeType?.startsWith("image/") && (
                <NextImage
                  src={previewBlobUrl}
                  alt={previewFile.fileName}
                  width={1200}
                  height={800}
                  className="max-w-full max-h-[80vh] w-auto h-auto object-contain p-4"
                  unoptimized
                />
              )}

            {/* PDF preview */}
            {!previewLoading &&
              !previewError &&
              previewBlobUrl &&
              previewFile?.mimeType === "application/pdf" && (
                <iframe
                  src={previewBlobUrl}
                  className="w-full h-full border-0"
                  title={previewFile.fileName}
                />
              )}

            {/* Exported Workspace file (Docs/Slides/Drawings) as PDF */}
            {!previewLoading &&
              !previewError &&
              previewBlobUrl &&
              previewFile?.mimeType?.startsWith("video/") && (
                <video
                  src={previewBlobUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh] w-auto h-auto p-4"
                />
              )}

            {/* Audio preview */}
            {!previewLoading &&
              !previewError &&
              previewBlobUrl &&
              previewFile?.mimeType?.startsWith("audio/") && (
                <div className="flex flex-col items-center gap-6 p-8">
                  <Music className="h-20 w-20 text-pink-400" />
                  <p className="text-sm font-medium text-foreground">
                    {previewFile.fileName}
                  </p>
                  <audio
                    src={previewBlobUrl}
                    controls
                    autoPlay
                    className="w-full max-w-md"
                  />
                </div>
              )}

            {/* Exported Workspace file (Docs/Slides/Drawings) as PDF */}
            {!previewLoading &&
              !previewError &&
              previewBlobUrl &&
              previewFile?.mimeType &&
              driveService.PREVIEWABLE_WORKSPACE_TYPES.has(previewFile.mimeType) && (
                <iframe
                  src={previewBlobUrl}
                  className="w-full h-full border-0"
                  title={previewFile.fileName}
                />
              )}

            {/* Floating "Open in Google" button for workspace files */}
            {!previewLoading &&
              !previewError &&
              previewFile?.mimeType &&
              driveService.PREVIEWABLE_WORKSPACE_TYPES.has(previewFile.mimeType) && (
                <Button
                  className="absolute bottom-6 right-6 shadow-lg gap-2"
                  onClick={async () => {
                    try {
                      const url = await openFile(previewFile);
                      window.open(url, "_blank", "noopener");
                    } catch {
                      toast.error("Failed to open in Google");
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Google
                </Button>
              )}
          </div>

          <DialogFooter className="px-6 py-2 border-t gap-2" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

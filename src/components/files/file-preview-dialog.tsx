"use client";

import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { X, Loader2, ExternalLink, Music } from "lucide-react";
import * as driveService from "@/services/drive";
import type { FileMetadata } from "@/types";

interface FilePreviewDialogProps {
  file: FileMetadata | null;
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: (file: FileMetadata) => void;
  onOpenInGoogle: (file: FileMetadata) => void;
}

export function FilePreviewDialog({
  file,
  blobUrl,
  loading,
  error,
  onClose,
  onRetry,
  onOpenInGoogle,
}: FilePreviewDialogProps) {
  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw]! w-full max-h-[92vh] h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-8 text-lg">
              {file?.fileName}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-muted/30 relative">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading preview…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <X className="h-7 w-7 text-destructive" />
              </div>
              <p className="text-sm font-medium">Could not load preview</p>
              <p className="text-xs max-w-md">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => file && onRetry(file)}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Image preview */}
          {!loading &&
            !error &&
            blobUrl &&
            file?.mimeType?.startsWith("image/") && (
              <NextImage
                src={blobUrl}
                alt={file.fileName}
                width={1200}
                height={800}
                className="max-w-full max-h-[80vh] w-auto h-auto object-contain p-4"
                unoptimized
              />
            )}

          {/* PDF preview */}
          {!loading &&
            !error &&
            blobUrl &&
            file?.mimeType === "application/pdf" && (
              <iframe
                src={blobUrl}
                className="w-full h-full border-0"
                title={file.fileName}
              />
            )}

          {/* Video preview */}
          {!loading &&
            !error &&
            blobUrl &&
            file?.mimeType?.startsWith("video/") && (
              <video
                src={blobUrl}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] w-auto h-auto p-4"
              />
            )}

          {/* Audio preview */}
          {!loading &&
            !error &&
            blobUrl &&
            file?.mimeType?.startsWith("audio/") && (
              <div className="flex flex-col items-center gap-6 p-8">
                <Music className="h-20 w-20 text-pink-400" />
                <p className="text-sm font-medium text-foreground">
                  {file.fileName}
                </p>
                <audio
                  src={blobUrl}
                  controls
                  autoPlay
                  className="w-full max-w-md"
                />
              </div>
            )}

          {/* Exported Workspace file (Docs/Slides/Drawings) as PDF */}
          {!loading &&
            !error &&
            blobUrl &&
            file?.mimeType &&
            driveService.PREVIEWABLE_WORKSPACE_TYPES.has(file.mimeType) && (
              <iframe
                src={blobUrl}
                className="w-full h-full border-0"
                title={file.fileName}
              />
            )}

          {/* Floating "Open in Google" button for workspace files */}
          {!loading &&
            !error &&
            file?.mimeType &&
            driveService.PREVIEWABLE_WORKSPACE_TYPES.has(file.mimeType) && (
              <Button
                className="absolute bottom-6 right-6 shadow-lg gap-2"
                onClick={() => file && onOpenInGoogle(file)}
              >
                <ExternalLink className="h-4 w-4" />
                Open in Google
              </Button>
            )}
        </div>

        <DialogFooter className="px-6 py-2 border-t gap-2" />
      </DialogContent>
    </Dialog>
  );
}

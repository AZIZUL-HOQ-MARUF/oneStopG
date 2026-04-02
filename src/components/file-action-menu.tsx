"use client";

import { memo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Share2,
  FolderInput,
  Eye,
  ExternalLink,
} from "lucide-react";
import * as driveService from "@/services/drive";
import type { FileMetadata } from "@/types";

function canPreviewInline(mimeType: string | null): boolean {
  const t = mimeType ?? "";
  if (t.startsWith("image/") || t === "application/pdf") return true;
  if (driveService.PREVIEWABLE_WORKSPACE_TYPES.has(t)) return true;
  return false;
}

interface FileActionMenuProps {
  file: FileMetadata;
  onOpen: (file: FileMetadata) => void;
  onRename: (file: FileMetadata) => void;
  onMove: (files: FileMetadata[]) => void;
  onDownload: (file: FileMetadata) => void;
  onShare: (file: FileMetadata) => void;
  onTrash: (file: FileMetadata) => void;
}

export const FileActionMenu = memo(function FileActionMenu({
  file,
  onOpen,
  onRename,
  onMove,
  onDownload,
  onShare,
  onTrash,
}: FileActionMenuProps) {
  const isFolder = file.mimeType === "application/vnd.google-apps.folder";
  return (
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
        {!isFolder && (
          <DropdownMenuItem onClick={() => onOpen(file)}>
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
        )}
        <DropdownMenuItem onClick={() => onRename(file)}>
          <Pencil className="mr-2 h-4 w-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMove([file])}>
          <FolderInput className="mr-2 h-4 w-4" />
          Move to…
        </DropdownMenuItem>
        {!isFolder && (
          <>
            <DropdownMenuItem onClick={() => onDownload(file)}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare(file)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onTrash(file)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

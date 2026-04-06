"use client";

import NextImage from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { FileIcon } from "@/components/files/file-icon";
import { FileActionMenu } from "@/components/file-action-menu";
import { formatBytes } from "@/lib/format";
import type { FileMetadata } from "@/types";

interface FileGridViewProps {
  files: FileMetadata[];
  selectedIds: Set<string>;
  dragOverFolder: string | null;
  draggedFile: FileMetadata | null;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpenFile: (file: FileMetadata) => void;
  onDragStart: (e: React.DragEvent, file: FileMetadata) => void;
  onDragEnd: () => void;
  onFolderDragOver: (e: React.DragEvent, folderId: string) => void;
  onFolderDragLeave: () => void;
  onFolderDrop: (e: React.DragEvent, folder: FileMetadata) => void;
  onRename: (file: FileMetadata) => void;
  onMove: (files: FileMetadata[]) => void;
  onDownload: (file: FileMetadata) => void;
  onShare: (file: FileMetadata) => void;
  onTrash: (file: FileMetadata) => void;
}

export function FileGridView({
  files,
  selectedIds,
  dragOverFolder,
  draggedFile,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onOpenFile,
  onDragStart,
  onDragEnd,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
  onRename,
  onMove,
  onDownload,
  onShare,
  onTrash,
}: FileGridViewProps) {
  return (
    <div>
      {/* Select-all bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <Checkbox
          checked={
            selectedIds.size === files.length && files.length > 0
          }
          onCheckedChange={(checked) =>
            checked ? onSelectAll() : onDeselectAll()
          }
        />
        <span className="text-xs text-muted-foreground font-medium">
          Select all
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {files.map((file) => {
          const isFolder =
            file.mimeType === "application/vnd.google-apps.folder";
          return (
            <div
              key={file.driveFileId}
              draggable
              onDragStart={(e) => onDragStart(e, file)}
              onDragEnd={onDragEnd}
              onDragOver={
                isFolder
                  ? (e) => onFolderDragOver(e, file.driveFileId)
                  : undefined
              }
              onDragLeave={isFolder ? onFolderDragLeave : undefined}
              onDrop={
                isFolder ? (e) => onFolderDrop(e, file) : undefined
              }
              className={`group relative flex flex-col items-center rounded-lg border border-border p-4 hover:bg-accent transition-colors cursor-pointer ${
                dragOverFolder === file.driveFileId
                  ? "ring-2 ring-primary bg-primary/5"
                  : ""
              } ${
                draggedFile?.driveFileId === file.driveFileId
                  ? "opacity-50"
                  : ""
              } ${
                selectedIds.has(file.driveFileId)
                  ? "bg-accent/60 border-primary/40"
                  : ""
              }`}
              onClick={() => onOpenFile(file)}
            >
              {/* Checkbox top-left */}
              <div
                className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity data-checked:opacity-100"
                data-checked={
                  selectedIds.has(file.driveFileId) || undefined
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(file.driveFileId);
                }}
              >
                <Checkbox
                  checked={selectedIds.has(file.driveFileId)}
                  onCheckedChange={() =>
                    onToggleSelect(file.driveFileId)
                  }
                />
              </div>

              {/* Action menu top-right */}
              <div
                className="absolute top-1 right-1"
                onClick={(e) => e.stopPropagation()}
              >
                <FileActionMenu
                  file={file}
                  onOpen={onOpenFile}
                  onRename={onRename}
                  onMove={onMove}
                  onDownload={onDownload}
                  onShare={onShare}
                  onTrash={onTrash}
                />
              </div>

              {file.thumbnailLink &&
              file.mimeType?.startsWith("image/") ? (
                <NextImage
                  src={file.thumbnailLink}
                  alt={file.fileName}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded object-cover"
                  unoptimized
                />
              ) : (
                <FileIcon mimeType={file.mimeType} />
              )}
              <p className="mt-2 text-xs font-medium text-center truncate w-full">
                {file.fileName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatBytes(file.size)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

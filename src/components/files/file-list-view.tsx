"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { FileIcon } from "@/components/files/file-icon";
import { FileActionMenu } from "@/components/file-action-menu";
import { formatBytes, formatDate } from "@/lib/format";
import type { FileMetadata } from "@/types";

interface FileListViewProps {
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

export function FileListView({
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
}: FileListViewProps) {
  return (
    <div className="divide-y divide-border">
      {/* Select-all header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-muted/30">
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={
              selectedIds.size === files.length && files.length > 0
            }
            onCheckedChange={(checked) =>
              checked ? onSelectAll() : onDeselectAll()
            }
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">Name</span>
        <span className="text-xs text-muted-foreground hidden sm:block ml-auto mr-24">
          Size
        </span>
        <span className="text-xs text-muted-foreground hidden md:block mr-10">
          Created
        </span>
      </div>
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
            className={`flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors group cursor-pointer ${
              dragOverFolder === file.driveFileId
                ? "ring-2 ring-primary ring-inset bg-primary/5"
                : ""
            } ${
              draggedFile?.driveFileId === file.driveFileId
                ? "opacity-50"
                : ""
            } ${
              selectedIds.has(file.driveFileId) ? "bg-accent/60" : ""
            }`}
            onClick={() => onOpenFile(file)}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(file.driveFileId);
              }}
            >
              <Checkbox
                checked={selectedIds.has(file.driveFileId)}
                onCheckedChange={() => onToggleSelect(file.driveFileId)}
              />
            </div>
            <FileIcon mimeType={file.mimeType} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{file.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {file.accountEmail}
              </p>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {formatBytes(file.size)}
            </span>
            <span className="hidden text-xs text-muted-foreground md:block">
              {formatDate(file.createdAt)}
            </span>
            <div onClick={(e) => e.stopPropagation()}>
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
          </div>
        );
      })}
    </div>
  );
}

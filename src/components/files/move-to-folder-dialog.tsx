"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { FolderOpen, Check } from "lucide-react";
import type { FileMetadata } from "@/types";

interface MoveToFolderDialogProps {
  files: FileMetadata[] | null;
  targetId: string | null;
  onTargetChange: (id: string) => void;
  folderSearch: string;
  onFolderSearchChange: (search: string) => void;
  filteredFolders: FileMetadata[];
  onMove: () => void;
  onClose: () => void;
}

export function MoveToFolderDialog({
  files,
  targetId,
  onTargetChange,
  folderSearch,
  onFolderSearchChange,
  filteredFolders,
  onMove,
  onClose,
}: MoveToFolderDialogProps) {
  return (
    <Dialog open={!!files} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Move{" "}
            {files?.length === 1
              ? `"${files[0].fileName}"`
              : `${files?.length} items`}
          </DialogTitle>
          <DialogDescription>Select a destination folder</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search folders…"
            value={folderSearch}
            onChange={(e) => onFolderSearchChange(e.target.value)}
            autoFocus
          />
          <div className="max-h-60 overflow-y-auto rounded-md border border-border divide-y divide-border">
            {filteredFolders.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No folders found
              </div>
            ) : (
              filteredFolders.map((folder) => (
                <button
                  key={folder.driveFileId}
                  onClick={() => onTargetChange(folder.driveFileId)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors ${
                    targetId === folder.driveFileId
                      ? "bg-primary/10 text-primary"
                      : ""
                  }`}
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-blue-400" />
                  <span className="text-sm truncate flex-1">
                    {folder.fileName}
                  </span>
                  {targetId === folder.driveFileId && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onMove} disabled={!targetId}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

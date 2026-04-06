"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface NewFolderDialogProps {
  open: boolean;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export function NewFolderDialog({
  open,
  folderName,
  onFolderNameChange,
  onCreate,
  onClose,
}: NewFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader className="pb-2">
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Folder name"
          value={folderName}
          onChange={(e) => onFolderNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCreate()}
          autoFocus
        />
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

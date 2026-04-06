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
import type { FileMetadata } from "@/types";

interface RenameDialogProps {
  file: FileMetadata | null;
  name: string;
  onNameChange: (name: string) => void;
  onRename: () => void;
  onClose: () => void;
}

export function RenameDialog({
  file,
  name,
  onNameChange,
  onRename,
  onClose,
}: RenameDialogProps) {
  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onRename()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onRename}>Rename</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Link, Mail } from "lucide-react";
import type { FileMetadata } from "@/types";

interface ShareDialogProps {
  file: FileMetadata | null;
  email: string;
  onEmailChange: (email: string) => void;
  loading: boolean;
  onShareLink: () => void;
  onShareEmail: () => void;
  onClose: () => void;
}

export function ShareDialog({
  file,
  email,
  onEmailChange,
  loading,
  onShareLink,
  onShareEmail,
  onClose,
}: ShareDialogProps) {
  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{file?.fileName}&rdquo;</DialogTitle>
          <DialogDescription>
            Share with a specific person or get a public link
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Email sharing */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share with email</label>
            <div className="flex gap-2">
              <Input
                placeholder="person@gmail.com"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onShareEmail()}
              />
              <Button
                onClick={onShareEmail}
                disabled={!email.trim() || loading}
                size="sm"
                className="shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="mr-1 h-4 w-4" />
                    Share
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          {/* Link sharing */}
          <Button
            variant="outline"
            className="w-full"
            onClick={onShareLink}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Link className="mr-2 h-4 w-4" />
            )}
            Copy share link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

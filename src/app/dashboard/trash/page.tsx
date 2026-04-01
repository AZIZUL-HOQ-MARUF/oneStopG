"use client";

import { useEffect, useState } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import * as drive from "@/services/drive";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, RotateCcw, XCircle, File } from "lucide-react";
import type { FileMetadata } from "@/types";

export default function TrashPage() {
  const { accounts, getToken } = useAccounts();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTrash = async () => {
    setIsLoading(true);
    const allTrash: FileMetadata[] = [];

    for (const account of accounts) {
      try {
        const token = await getToken(account.email);
        const trashed = await drive.listTrash(token, account.email);
        allTrash.push(...trashed);
      } catch (err) {
        console.warn(`Failed to load trash for ${account.email}:`, err);
      }
    }

    setFiles(allTrash);
    setIsLoading(false);
  };

  useEffect(() => {
    if (accounts.length > 0) loadTrash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const handleRestore = async (file: FileMetadata) => {
    try {
      const token = await getToken(file.accountEmail);
      await drive.restoreFile(token, file.driveFileId);
      toast.success("File restored");
      loadTrash();
    } catch (err) {
      toast.error("Failed to restore", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleDelete = async (file: FileMetadata) => {
    try {
      const token = await getToken(file.accountEmail);
      await drive.deleteFile(token, file.driveFileId);
      toast.success("Permanently deleted");
      loadTrash();
    } catch (err) {
      toast.error("Failed to delete", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trash</h1>
        <p className="text-muted-foreground">
          Restore or permanently delete trashed files
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Trashed Files
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading..."
              : `${files.length} file${files.length !== 1 ? "s" : ""} in trash`}
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
              <Trash2 className="h-12 w-12 mb-4" />
              <p className="text-lg">Trash is empty</p>
              <p className="text-sm mt-1">
                Files you delete will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {files.map((file) => (
                <div
                  key={file.driveFileId}
                  className="flex items-center gap-3 py-3"
                >
                  <File className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {file.fileName}
                    </p>
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
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRestore(file)}
                      title="Restore"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(file)}
                      title="Delete permanently"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

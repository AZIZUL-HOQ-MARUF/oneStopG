"use client";

import { useEffect, useState } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import * as drive from "@/services/drive";
import { formatBytes, formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Share2, File } from "lucide-react";
import type { FileMetadata } from "@/types";

export default function SharedPage() {
  const { accounts, getToken } = useAccounts();
  const [files, setFiles] = useState<
    (FileMetadata & { sharedBy: string | null })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (accounts.length === 0) return;

    const loadShared = async () => {
      setIsLoading(true);
      const allShared: (FileMetadata & { sharedBy: string | null })[] = [];

      for (const account of accounts) {
        try {
          const token = await getToken(account.email);
          const shared = await drive.listSharedFiles(token, account.email);
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
                  className="flex items-center gap-3 py-3"
                >
                  <File className="h-5 w-5 text-muted-foreground shrink-0" />
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

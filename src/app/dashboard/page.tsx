"use client";

import { useFiles } from "@/hooks/useFiles";
import { useStorage } from "@/hooks/useStorage";
import { useStats } from "@/hooks/useStats";
import { useAccounts } from "@/hooks/useAccounts";
import { formatBytes } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Files, HardDrive, Users, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { files, isLoading: filesLoading } = useFiles();
  const { quotas, totalUsed, totalLimit, totalFree, isLoading: storageLoading } =
    useStorage();
  const { accounts } = useAccounts();
  const stats = useStats(files, quotas);

  const isLoading = filesLoading || storageLoading;

  const statCards = [
    {
      title: "Total Files",
      value: stats.totalFiles.toLocaleString(),
      description: `${stats.totalFolders} folders`,
      icon: Files,
    },
    {
      title: "Total Storage",
      value: formatBytes(totalUsed),
      description: `${formatBytes(totalFree)} free of ${formatBytes(totalLimit)}`,
      icon: HardDrive,
    },
    {
      title: "Connected Accounts",
      value: accounts.length.toString(),
      description: `${formatBytes(totalLimit)} total capacity`,
      icon: Users,
    },
    {
      title: "Total Size",
      value: formatBytes(stats.totalSize),
      description: "Across all accounts",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">
          Your unified Google Drive dashboard
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-Account Storage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage by Account</CardTitle>
          <CardDescription>
            Usage across all connected Google Drive accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))
          ) : (
            quotas.map((q) => {
              const percent =
                q.limit > 0 ? Math.round((q.used / q.limit) * 100) : 0;
              return (
                <div key={q.email} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{q.email}</span>
                    <span className="text-muted-foreground">
                      {formatBytes(q.used)} / {formatBytes(q.limit)} ({percent}%)
                    </span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* File Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>File Types</CardTitle>
          <CardDescription>Distribution of files by category</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(stats.filesByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <span className="text-sm font-medium">{type}</span>
                    <span className="text-sm text-muted-foreground">
                      {count} file{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Files */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Files</CardTitle>
          <CardDescription>Most recently created files</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {files
                .filter(
                  (f) =>
                    f.mimeType !== "application/vnd.google-apps.folder",
                )
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .slice(0, 10)
                .map((file) => (
                  <div
                    key={file.driveFileId}
                    className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {file.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.accountEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>
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

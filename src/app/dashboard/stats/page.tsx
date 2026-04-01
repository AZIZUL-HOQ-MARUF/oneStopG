"use client";

import { useFiles } from "@/hooks/useFiles";
import { useStorage } from "@/hooks/useStorage";
import { useStats } from "@/hooks/useStats";
import { formatBytes } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, HardDrive, FileStack, FolderOpen } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

const ACCOUNT_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-sm shadow-lg border border-border">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} files</p>
    </div>
  );
}

function StorageTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-sm shadow-lg border border-border">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">{formatBytes(payload[0].value)}</p>
    </div>
  );
}

export default function StatsPage() {
  const { files, isLoading: filesLoading } = useFiles();
  const { quotas, isLoading: storageLoading } = useStorage();
  const stats = useStats(files, quotas);

  const isLoading = filesLoading || storageLoading;

  // Prepare chart data
  const weeklyData = stats.weeklyUploads.map((w) => ({
    name: w.date,
    files: w.count,
  }));

  const fileTypeData = Object.entries(stats.filesByType)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({ name: type, value: count }));

  const storageSizeData = Object.entries(stats.sizeByType)
    .sort(([, a], [, b]) => b - a)
    .filter(([, size]) => size > 0)
    .map(([type, size]) => ({ name: type, size }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Storage and upload insights across your accounts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <FileStack className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalFiles}</p>
              <p className="text-xs text-muted-foreground">Total Files</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
              <FolderOpen className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalFolders}</p>
              <p className="text-xs text-muted-foreground">Total Folders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <HardDrive className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatBytes(stats.totalSize)}</p>
              <p className="text-xs text-muted-foreground">Total Storage Used</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <BarChart3 className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{quotas.length}</p>
              <p className="text-xs text-muted-foreground">Connected Accounts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Upload Activity - Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Weekly Upload Activity
          </CardTitle>
          <CardDescription>Files uploaded in the last 8 weeks</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-75 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="files" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {weeklyData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* File Type Distribution - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>File Type Distribution</CardTitle>
            <CardDescription>Files grouped by category</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-75 w-full" />
            ) : fileTypeData.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No files yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={fileTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={(props: PieLabelRenderProps) => {
                      const name = String(props.name ?? "");
                      const pct = Number(props.percent ?? 0);
                      return `${name} ${(pct * 100).toFixed(0)}%`;
                    }}
                    labelLine={false}
                  >
                    {fileTypeData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} files`, "Count"]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Storage by Account - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Storage by Account</CardTitle>
            <CardDescription>Usage per connected account</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-75 w-full" />
            ) : (
              <div className="space-y-6">
                {quotas.map((q, i) => {
                  const percent =
                    q.limit > 0 ? Math.round((q.used / q.limit) * 100) : 0;
                  const color = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length];
                  return (
                    <div key={q.email} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-medium truncate max-w-50">
                            {q.email}
                          </span>
                        </div>
                        <span className="text-muted-foreground font-medium">
                          {percent}%
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%`, backgroundColor: color }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatBytes(q.used)} used</span>
                        <span>{formatBytes(q.free)} free of {formatBytes(q.limit)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Storage by File Type - Horizontal Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Storage by File Type</CardTitle>
          <CardDescription>Space used by each file category</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-75 w-full" />
          ) : storageSizeData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(storageSizeData.length * 50, 200)}>
              <BarChart
                data={storageSizeData}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatBytes(v)}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  width={75}
                />
                <Tooltip content={<StorageTooltip />} />
                <Bar dataKey="size" radius={[0, 6, 6, 0]} maxBarSize={30}>
                  {storageSizeData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

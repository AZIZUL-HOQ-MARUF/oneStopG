"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  Search,
  FolderPlus,
  Grid,
  List,
  RefreshCw,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { SORT_LABELS, type SortField, type SortDir } from "@/lib/file-helpers";

interface FilesHeaderProps {
  breadcrumbs: { id: string | null; name: string }[];
  onNavigateBreadcrumb: (index: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: SortField;
  onSortByChange: (field: SortField) => void;
  sortDir: SortDir;
  onSortDirToggle: () => void;
  viewMode: "list" | "grid";
  onViewModeToggle: () => void;
  onRefresh: () => void;
  onNewFolder: () => void;
  onUpload: (files: FileList | null) => void;
}

export function FilesHeader({
  breadcrumbs,
  onNavigateBreadcrumb,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirToggle,
  viewMode,
  onViewModeToggle,
  onRefresh,
  onNewFolder,
  onUpload,
}: FilesHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">Files</h1>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.id ?? "root"} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
              <button
                onClick={() => onNavigateBreadcrumb(i)}
                className={`hover:text-foreground transition-colors ${
                  i === breadcrumbs.length - 1
                    ? "text-foreground font-medium"
                    : ""
                }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 w-64"
          />
        </div>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {SORT_LABELS[sortBy]}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(v) => onSortByChange(v as SortField)}
            >
              {(Object.keys(SORT_LABELS) as SortField[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon"
          onClick={onSortDirToggle}
          title={sortDir === "asc" ? "Ascending" : "Descending"}
        >
          {sortDir === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
        </Button>

        <Button variant="outline" size="icon" onClick={onViewModeToggle}>
          {viewMode === "list" ? (
            <Grid className="h-4 w-4" />
          ) : (
            <List className="h-4 w-4" />
          )}
        </Button>

        <Button variant="outline" size="icon" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button variant="outline" onClick={onNewFolder}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Folder
        </Button>

        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
      </div>
    </div>
  );
}

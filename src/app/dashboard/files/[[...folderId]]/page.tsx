"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import NextImage from "next/image";
import { useFiles } from "@/hooks/useFiles";
import { useDrive } from "@/hooks/useDrive";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Share2,
  FolderOpen,
  FolderPlus,
  FolderInput,
  File,
  Image,
  Video,
  Music,
  FileText,
  Table,
  Archive,
  Grid,
  List,
  RefreshCw,
  ChevronRight,
  Eye,
  ExternalLink,
  X,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Link,
  Mail,
  Check,
} from "lucide-react";
import * as driveService from "@/services/drive";
import type { FileMetadata } from "@/types";

// ── Helpers ─────────────────────────────────────────────────
type SortField = "name" | "date" | "size" | "type";
type SortDir = "asc" | "desc";

function FileIcon({ mimeType }: { mimeType: string | null }) {
  const t = mimeType ?? "";
  if (t === "application/vnd.google-apps.folder")
    return <FolderOpen className="h-5 w-5 text-blue-400" />;
  if (t.startsWith("image/"))
    // eslint-disable-next-line jsx-a11y/alt-text -- lucide-react icon, not <img>
    return <Image className="h-5 w-5 text-green-400" />;
  if (t.startsWith("video/"))
    return <Video className="h-5 w-5 text-purple-400" />;
  if (t.startsWith("audio/"))
    return <Music className="h-5 w-5 text-pink-400" />;
  if (t.includes("pdf") || t.includes("document") || t.startsWith("text/"))
    return <FileText className="h-5 w-5 text-orange-400" />;
  if (t.includes("spreadsheet") || t.includes("sheet"))
    return <Table className="h-5 w-5 text-emerald-400" />;
  if (t.includes("zip") || t.includes("compressed"))
    return <Archive className="h-5 w-5 text-yellow-400" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function canPreviewInline(mimeType: string | null): boolean {
  const t = mimeType ?? "";
  return t.startsWith("image/") || t === "application/pdf";
}

const SORT_LABELS: Record<SortField, string> = {
  name: "Name",
  date: "Date",
  size: "Size",
  type: "Type",
};

// ── Main component ──────────────────────────────────────────
export default function FilesPage() {
  const params = useParams<{ folderId?: string[] }>();
  const router = useRouter();
  const currentFolder = params.folderId?.[0] ?? null;

  const { files, isLoading, refreshFiles } = useFiles();
  const {
    renameFile,
    moveFile,
    trashFile,
    shareFile,
    getDownloadUrl,
    openFile,
    getPreviewBlobUrl,
    createFolder,
    uploadFile,
  } = useDrive();

  // ── State ─────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [accountFilter, setAccountFilter] = useState<string | "all">("all");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Rename dialog
  const [renameDialog, setRenameDialog] = useState<FileMetadata | null>(null);
  const [newName, setNewName] = useState("");

  // New folder dialog
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState("");

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Move dialog (single or bulk)
  const [moveDialog, setMoveDialog] = useState<FileMetadata[] | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [moveFolderSearch, setMoveFolderSearch] = useState("");

  // Share dialog
  const [shareDialog, setShareDialog] = useState<FileMetadata | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareLoading, setShareLoading] = useState(false);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drag-and-drop move
  const [draggedFile, setDraggedFile] = useState<FileMetadata | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // ── Derived data ──────────────────────────────────────────
  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [
      { id: null, name: "My Drive" },
    ];
    if (!currentFolder) return crumbs;
    const visited = new Set<string>();
    let fId: string | null = currentFolder;
    const chain: { id: string; name: string }[] = [];
    while (fId) {
      if (visited.has(fId)) break;
      visited.add(fId);
      const folder = files.find((f) => f.driveFileId === fId);
      if (!folder) break;
      chain.unshift({ id: folder.driveFileId, name: folder.fileName });
      fId = folder.parentDriveFileId;
    }
    return [...crumbs, ...chain];
  }, [currentFolder, files]);

  const accountEmails = useMemo(
    () => [...new Set(files.map((f) => f.accountEmail))],
    [files],
  );

  const filteredFiles = files.filter((f) => {
    if (accountFilter !== "all" && f.accountEmail !== accountFilter)
      return false;
    const inFolder =
      currentFolder === null
        ? f.parentDriveFileId === null ||
          !files.some((p) => p.driveFileId === f.parentDriveFileId)
        : f.parentDriveFileId === currentFolder;
    const matchesSearch =
      !search || f.fileName.toLowerCase().includes(search.toLowerCase());
    return inFolder && matchesSearch;
  });

  const sortedFiles = useMemo(() => {
    const arr = [...filteredFiles];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      // Folders always first
      const aIsFolder = a.mimeType === "application/vnd.google-apps.folder";
      const bIsFolder = b.mimeType === "application/vnd.google-apps.folder";
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;

      switch (sortBy) {
        case "name":
          return dir * a.fileName.localeCompare(b.fileName);
        case "date":
          return (
            dir *
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime())
          );
        case "size":
          return dir * (a.size - b.size);
        case "type":
          return dir * (a.mimeType ?? "").localeCompare(b.mimeType ?? "");
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredFiles, sortBy, sortDir]);

  // Folders available for the move dialog (same account, exclude items being moved)
  const moveFolders = useMemo(() => {
    if (!moveDialog || moveDialog.length === 0) return [];
    const movingIds = new Set(moveDialog.map((f) => f.driveFileId));
    const email = moveDialog[0].accountEmail;
    return files.filter(
      (f) =>
        f.mimeType === "application/vnd.google-apps.folder" &&
        f.accountEmail === email &&
        !movingIds.has(f.driveFileId),
    );
  }, [moveDialog, files]);

  const filteredMoveFolders = useMemo(() => {
    if (!moveFolderSearch) return moveFolders;
    const q = moveFolderSearch.toLowerCase();
    return moveFolders.filter((f) => f.fileName.toLowerCase().includes(q));
  }, [moveFolders, moveFolderSearch]);

  // ── Selection helpers ─────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(sortedFiles.map((f) => f.driveFileId)));
  }, [sortedFiles]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedFiles = useMemo(
    () => files.filter((f) => selectedIds.has(f.driveFileId)),
    [files, selectedIds],
  );

  // ── Navigation ────────────────────────────────────────────
  const navigateToFolder = (file: FileMetadata) => {
    router.push(`/dashboard/files/${file.driveFileId}`);
  };

  const navigateToBreadcrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    if (crumb.id === null) {
      router.push("/dashboard/files");
    } else {
      router.push(`/dashboard/files/${crumb.id}`);
    }
  };

  // ── Preview ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  const closePreview = useCallback(() => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewFile(null);
    setPreviewBlobUrl(null);
    setPreviewLoading(false);
    setPreviewError(null);
  }, [previewBlobUrl]);

  const handleOpenFile = async (file: FileMetadata) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      navigateToFolder(file);
      return;
    }
    if (driveService.isGoogleWorkspaceFile(file.mimeType)) {
      try {
        const url = await openFile(file);
        window.open(url, "_blank", "noopener");
      } catch (err) {
        toast.error("Failed to open file", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
      return;
    }
    if (canPreviewInline(file.mimeType)) {
      setPreviewFile(file);
      setPreviewBlobUrl(null);
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const blobUrl = await getPreviewBlobUrl(file);
        setPreviewBlobUrl(blobUrl);
      } catch (err) {
        setPreviewError(
          err instanceof Error ? err.message : "Failed to load preview",
        );
      } finally {
        setPreviewLoading(false);
      }
      return;
    }
    handleDownload(file);
  };

  // ── CRUD handlers ─────────────────────────────────────────
  const handleRename = async () => {
    if (!renameDialog || !newName.trim()) return;
    try {
      await renameFile(renameDialog, newName.trim());
      toast.success("File renamed");
      setRenameDialog(null);
      refreshFiles();
    } catch (err) {
      toast.error("Failed to rename file", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    try {
      const email = accountFilter !== "all" ? accountFilter : undefined;
      await createFolder(folderName.trim(), currentFolder ?? undefined, email);
      toast.success("Folder created");
      setNewFolderDialog(false);
      setFolderName("");
      refreshFiles();
    } catch (err) {
      toast.error("Failed to create folder", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleTrash = async (file: FileMetadata) => {
    try {
      await trashFile(file);
      toast.success("Moved to trash");
      refreshFiles();
    } catch (err) {
      toast.error("Failed to trash file", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      const url = await getDownloadUrl(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      toast.error("Failed to download", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  // ── Share handlers ────────────────────────────────────────
  const handleShareLink = async () => {
    if (!shareDialog) return;
    setShareLoading(true);
    try {
      const url = await shareFile(shareDialog);
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard");
      setShareDialog(null);
      setShareEmail("");
    } catch (err) {
      toast.error("Failed to share file", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setShareLoading(false);
    }
  };

  const handleShareEmail = async () => {
    if (!shareDialog || !shareEmail.trim()) return;
    setShareLoading(true);
    try {
      await shareFile(shareDialog, shareEmail.trim());
      toast.success(`Shared with ${shareEmail.trim()}`);
      setShareDialog(null);
      setShareEmail("");
    } catch (err) {
      toast.error("Failed to share file", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setShareLoading(false);
    }
  };

  // ── Move handler ──────────────────────────────────────────
  const handleMove = async () => {
    if (!moveDialog || !moveTargetId) return;
    try {
      for (const file of moveDialog) {
        await moveFile(file, moveTargetId, file.parentDriveFileId ?? undefined);
      }
      const targetFolder = files.find((f) => f.driveFileId === moveTargetId);
      toast.success(
        `Moved ${moveDialog.length} item${moveDialog.length > 1 ? "s" : ""} to ${targetFolder?.fileName ?? "folder"}`,
      );
      setMoveDialog(null);
      setMoveTargetId(null);
      setMoveFolderSearch("");
      setSelectedIds(new Set());
      refreshFiles();
    } catch (err) {
      toast.error("Failed to move files", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  // ── Bulk actions ──────────────────────────────────────────
  const handleBulkTrash = async () => {
    try {
      for (const file of selectedFiles) {
        await trashFile(file);
      }
      toast.success(`Moved ${selectedFiles.length} items to trash`);
      setSelectedIds(new Set());
      refreshFiles();
    } catch (err) {
      toast.error("Failed to trash files", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleBulkMove = () => {
    if (selectedFiles.length === 0) return;
    // Check all selected files belong to same account
    const emails = new Set(selectedFiles.map((f) => f.accountEmail));
    if (emails.size > 1) {
      toast.error("Cannot move files from different accounts at once");
      return;
    }
    setMoveTargetId(null);
    setMoveFolderSearch("");
    setMoveDialog(selectedFiles);
  };

  // ── Upload ────────────────────────────────────────────────
  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setUploading(true);
      setUploadProgress(0);

      const uploadedIds: string[] = [];
      try {
        for (let i = 0; i < fileList.length; i++) {
          const result = await uploadFile(
            fileList[i],
            currentFolder ?? undefined,
            (pct) => setUploadProgress(pct),
          );
          uploadedIds.push(result.driveFileId);
        }
        await refreshFiles();

        // Post-upload: if in root folder, offer to organize
        if (currentFolder === null && uploadedIds.length > 0) {
          toast.success(
            `Uploaded ${fileList.length} file${fileList.length > 1 ? "s" : ""}`,
            {
              action: {
                label: "Organize",
                onClick: () => {
                  // Find the uploaded files in the refreshed store
                  const uploaded = files.filter((f) =>
                    uploadedIds.includes(f.driveFileId),
                  );
                  if (uploaded.length > 0) {
                    setMoveTargetId(null);
                    setMoveFolderSearch("");
                    setMoveDialog(uploaded);
                  }
                },
              },
            },
          );
        } else {
          toast.success(
            `Uploaded ${fileList.length} file${fileList.length > 1 ? "s" : ""} to current folder`,
          );
        }
      } catch (err) {
        toast.error("Upload failed", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [currentFolder, uploadFile, refreshFiles, files],
  );

  // ── Drag-and-drop ─────────────────────────────────────────
  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      // If an internal file is being dragged, ignore (handled by folder onDrop)
      if (e.dataTransfer.types.includes("application/x-onestopg-file")) return;
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload],
  );

  const handleDragStartInternal = useCallback(
    (e: React.DragEvent, file: FileMetadata) => {
      e.dataTransfer.setData("application/x-onestopg-file", file.driveFileId);
      e.dataTransfer.effectAllowed = "move";
      setDraggedFile(file);
    },
    [],
  );

  const handleFolderDragOver = useCallback(
    (e: React.DragEvent, folderId: string) => {
      if (!e.dataTransfer.types.includes("application/x-onestopg-file")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverFolder(folderId);
    },
    [],
  );

  const handleFolderDragLeave = useCallback(() => {
    setDragOverFolder(null);
  }, []);

  const handleFolderDrop = useCallback(
    async (e: React.DragEvent, targetFolder: FileMetadata) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverFolder(null);

      const fileId = e.dataTransfer.getData("application/x-onestopg-file");
      if (!fileId) return;

      const file = files.find((f) => f.driveFileId === fileId);
      if (!file) return;

      // Don't drop on itself or its own parent
      if (file.driveFileId === targetFolder.driveFileId) return;
      if (file.parentDriveFileId === targetFolder.driveFileId) return;

      // Must be same account
      if (file.accountEmail !== targetFolder.accountEmail) {
        toast.error("Cannot move files between accounts");
        return;
      }

      try {
        await moveFile(
          file,
          targetFolder.driveFileId,
          file.parentDriveFileId ?? undefined,
        );
        toast.success(`Moved "${file.fileName}" to "${targetFolder.fileName}"`);
        refreshFiles();
      } catch (err) {
        toast.error("Failed to move file", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
      setDraggedFile(null);
    },
    [files, moveFile, refreshFiles],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedFile(null);
    setDragOverFolder(null);
  }, []);

  // ── Per-item action menu (shared between list & grid) ─────
  function FileActionMenu({ file }: { file: FileMetadata }) {
    const isFolder = file.mimeType === "application/vnd.google-apps.folder";
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          }
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isFolder && (
            <DropdownMenuItem onClick={() => handleOpenFile(file)}>
              {canPreviewInline(file.mimeType) ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </>
              ) : driveService.isGoogleWorkspaceFile(file.mimeType) ? (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Google
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Open
                </>
              )}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => {
              setNewName(file.fileName);
              setRenameDialog(file);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setMoveTargetId(null);
              setMoveFolderSearch("");
              setMoveDialog([file]);
            }}
          >
            <FolderInput className="mr-2 h-4 w-4" />
            Move to…
          </DropdownMenuItem>
          {!isFolder && (
            <>
              <DropdownMenuItem onClick={() => handleDownload(file)}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setShareEmail("");
                  setShareDialog(file);
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleTrash(file)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Files</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <div key={crumb.id ?? "root"} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                <button
                  onClick={() => navigateToBreadcrumb(i)}
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
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {SORT_LABELS[sortBy]}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortField)}
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
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? "Ascending" : "Descending"}
          >
            {sortDir === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setViewMode(viewMode === "list" ? "grid" : "list")
            }
          >
            {viewMode === "list" ? (
              <Grid className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={refreshFiles}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFolderName("");
              setNewFolderDialog(true);
            }}
          >
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
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Account filter tabs */}
      {accountEmails.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={accountFilter === "all" ? "default" : "outline"}
            onClick={() => setAccountFilter("all")}
          >
            All Accounts
          </Badge>
          {accountEmails.map((email) => (
            <Badge
              key={email}
              variant={accountFilter === email ? "default" : "outline"}
              onClick={() => setAccountFilter(email)}
            >
              {email}
            </Badge>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <Upload className="h-4 w-4 animate-bounce text-primary" />
              <Progress value={uploadProgress} className="flex-1 h-2" />
              <span className="text-sm text-muted-foreground">
                {uploadProgress}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-select floating bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-50 mx-auto w-fit">
          <Card className="shadow-lg border-primary/30">
            <CardContent className="py-2 px-4 flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkMove}
              >
                <FolderInput className="mr-2 h-4 w-4" />
                Move to…
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleBulkTrash}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Trash
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                <X className="mr-1 h-4 w-4" />
                Deselect
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drop zone + file list */}
      <Card
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("application/x-onestopg-file"))
            e.preventDefault();
        }}
        onDrop={handleFileDrop}
        className="min-h-100"
      >
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-4" />
              <p className="text-lg">
                {search
                  ? "No files match your search"
                  : "This folder is empty"}
              </p>
              <p className="text-sm mt-1">
                Drag & drop files here or click Upload
              </p>
            </div>
          ) : viewMode === "list" ? (
            /* ── List view ──────────────────────────────────── */
            <div className="divide-y divide-border">
              {/* Select-all header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-muted/30">
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={
                      selectedIds.size === sortedFiles.length &&
                      sortedFiles.length > 0
                    }
                    onCheckedChange={(checked) =>
                      checked ? selectAll() : deselectAll()
                    }
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  Name
                </span>
                <span className="text-xs text-muted-foreground hidden sm:block ml-auto mr-24">
                  Size
                </span>
                <span className="text-xs text-muted-foreground hidden md:block mr-10">
                  Created
                </span>
              </div>
              {sortedFiles.map((file) => {
                const isFolder =
                  file.mimeType === "application/vnd.google-apps.folder";
                return (
                  <div
                    key={file.driveFileId}
                    draggable
                    onDragStart={(e) => handleDragStartInternal(e, file)}
                    onDragEnd={handleDragEnd}
                    onDragOver={
                      isFolder
                        ? (e) =>
                            handleFolderDragOver(e, file.driveFileId)
                        : undefined
                    }
                    onDragLeave={isFolder ? handleFolderDragLeave : undefined}
                    onDrop={
                      isFolder
                        ? (e) => handleFolderDrop(e, file)
                        : undefined
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
                    onClick={() => handleOpenFile(file)}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(file.driveFileId);
                      }}
                    >
                      <Checkbox
                        checked={selectedIds.has(file.driveFileId)}
                        onCheckedChange={() =>
                          toggleSelect(file.driveFileId)
                        }
                      />
                    </div>
                    <FileIcon mimeType={file.mimeType} />
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
                    <div onClick={(e) => e.stopPropagation()}>
                      <FileActionMenu file={file} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Grid view ─────────────────────────────────── */
            <div>
              {/* Select-all bar */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
                <Checkbox
                  checked={
                    selectedIds.size === sortedFiles.length &&
                    sortedFiles.length > 0
                  }
                  onCheckedChange={(checked) =>
                    checked ? selectAll() : deselectAll()
                  }
                />
                <span className="text-xs text-muted-foreground font-medium">
                  Select all
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {sortedFiles.map((file) => {
                  const isFolder =
                    file.mimeType === "application/vnd.google-apps.folder";
                  return (
                    <div
                      key={file.driveFileId}
                      draggable
                      onDragStart={(e) => handleDragStartInternal(e, file)}
                      onDragEnd={handleDragEnd}
                      onDragOver={
                        isFolder
                          ? (e) =>
                              handleFolderDragOver(e, file.driveFileId)
                          : undefined
                      }
                      onDragLeave={
                        isFolder ? handleFolderDragLeave : undefined
                      }
                      onDrop={
                        isFolder
                          ? (e) => handleFolderDrop(e, file)
                          : undefined
                      }
                      className={`group relative flex flex-col items-center rounded-lg border border-border p-4 hover:bg-accent transition-colors cursor-pointer ${
                        dragOverFolder === file.driveFileId
                          ? "ring-2 ring-primary bg-primary/5"
                          : ""
                      } ${
                        draggedFile?.driveFileId === file.driveFileId
                          ? "opacity-50"
                          : ""
                      } ${
                        selectedIds.has(file.driveFileId) ? "bg-accent/60 border-primary/40" : ""
                      }`}
                      onClick={() => handleOpenFile(file)}
                    >
                      {/* Checkbox top-left */}
                      <div
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity data-checked:opacity-100"
                        data-checked={
                          selectedIds.has(file.driveFileId) || undefined
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(file.driveFileId);
                        }}
                      >
                        <Checkbox
                          checked={selectedIds.has(file.driveFileId)}
                          onCheckedChange={() =>
                            toggleSelect(file.driveFileId)
                          }
                        />
                      </div>

                      {/* Action menu top-right */}
                      <div
                        className="absolute top-1 right-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileActionMenu file={file} />
                      </div>

                      {file.thumbnailLink &&
                      file.mimeType?.startsWith("image/") ? (
                        <NextImage
                          src={file.thumbnailLink}
                          alt={file.fileName}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded object-cover"
                          unoptimized
                        />
                      ) : (
                        <FileIcon mimeType={file.mimeType} />
                      )}
                      <p className="mt-2 text-xs font-medium text-center truncate w-full">
                        {file.fileName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Rename Dialog ──────────────────────────────────── */}
      <Dialog
        open={!!renameDialog}
        onOpenChange={(open) => !open && setRenameDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Folder Dialog ──────────────────────────────── */}
      <Dialog
        open={newFolderDialog}
        onOpenChange={(open) => !open && setNewFolderDialog(false)}
      >
        <DialogContent>
          <DialogHeader className="pb-2">
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setNewFolderDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Move to Folder Dialog ──────────────────────────── */}
      <Dialog
        open={!!moveDialog}
        onOpenChange={(open) => {
          if (!open) {
            setMoveDialog(null);
            setMoveTargetId(null);
            setMoveFolderSearch("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Move {moveDialog?.length === 1 ? `"${moveDialog[0].fileName}"` : `${moveDialog?.length} items`}
            </DialogTitle>
            <DialogDescription>
              Select a destination folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search folders…"
              value={moveFolderSearch}
              onChange={(e) => setMoveFolderSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {filteredMoveFolders.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No folders found
                </div>
              ) : (
                filteredMoveFolders.map((folder) => (
                  <button
                    key={folder.driveFileId}
                    onClick={() => setMoveTargetId(folder.driveFileId)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors ${
                      moveTargetId === folder.driveFileId
                        ? "bg-primary/10 text-primary"
                        : ""
                    }`}
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 text-blue-400" />
                    <span className="text-sm truncate flex-1">
                      {folder.fileName}
                    </span>
                    {moveTargetId === folder.driveFileId && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMoveDialog(null);
                setMoveTargetId(null);
                setMoveFolderSearch("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={!moveTargetId}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Share Dialog ───────────────────────────────────── */}
      <Dialog
        open={!!shareDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShareDialog(null);
            setShareEmail("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share &ldquo;{shareDialog?.fileName}&rdquo;</DialogTitle>
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
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleShareEmail()}
                />
                <Button
                  onClick={handleShareEmail}
                  disabled={!shareEmail.trim() || shareLoading}
                  size="sm"
                  className="shrink-0"
                >
                  {shareLoading ? (
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
              onClick={handleShareLink}
              disabled={shareLoading}
            >
              {shareLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link className="mr-2 h-4 w-4" />
              )}
              Copy share link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── File Preview Dialog ────────────────────────────── */}
      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent className="max-w-[90vw]! w-full max-h-[92vh] h-[92vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="truncate pr-8 text-lg">
                {previewFile?.fileName}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-muted/30 relative">
            {previewLoading && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading preview…</p>
              </div>
            )}

            {previewError && !previewLoading && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <X className="h-7 w-7 text-destructive" />
                </div>
                <p className="text-sm font-medium">Could not load preview</p>
                <p className="text-xs max-w-md">{previewError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    if (previewFile) handleOpenFile(previewFile);
                  }}
                >
                  Retry
                </Button>
              </div>
            )}

            {!previewLoading &&
              !previewError &&
              previewBlobUrl &&
              previewFile?.mimeType?.startsWith("image/") && (
                <NextImage
                  src={previewBlobUrl}
                  alt={previewFile.fileName}
                  width={1200}
                  height={800}
                  className="max-w-full max-h-[80vh] w-auto h-auto object-contain p-4"
                  unoptimized
                />
              )}

            {!previewLoading &&
              !previewError &&
              previewBlobUrl &&
              previewFile?.mimeType === "application/pdf" && (
                <iframe
                  src={previewBlobUrl}
                  className="w-full h-full border-0"
                  title={previewFile.fileName}
                />
              )}
          </div>

          <DialogFooter className="px-6 py-2 border-t gap-2" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

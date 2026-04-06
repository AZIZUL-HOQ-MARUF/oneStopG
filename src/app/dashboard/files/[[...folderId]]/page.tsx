"use client";

import { useState, useCallback, useMemo, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFiles } from "@/hooks/useFiles";
import { useDrive } from "@/hooks/useDrive";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen } from "lucide-react";
import { canPreviewInline, isSpreadsheet } from "@/lib/file-helpers";
import type { SortField, SortDir } from "@/lib/file-helpers";
import * as driveService from "@/services/drive";
import type { FileMetadata } from "@/types";

// ── Sub-components ──────────────────────────────────────────
import { FilesHeader } from "@/components/files/files-header";
import { AccountFilterTabs } from "@/components/files/account-filter-tabs";
import { UploadProgressBar } from "@/components/files/upload-progress-bar";
import { MultiSelectBar } from "@/components/files/multi-select-bar";
import { FileListView } from "@/components/files/file-list-view";
import { FileGridView } from "@/components/files/file-grid-view";
import { RenameDialog } from "@/components/files/rename-dialog";
import { NewFolderDialog } from "@/components/files/new-folder-dialog";
import { MoveToFolderDialog } from "@/components/files/move-to-folder-dialog";
import { ShareDialog } from "@/components/files/share-dialog";
import { FilePreviewDialog } from "@/components/files/file-preview-dialog";

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
    getExportBlobUrl,
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
  // O(1) lookup map for files by driveFileId
  const fileById = useMemo(() => {
    const m = new Map<string, FileMetadata>();
    for (const f of files) m.set(f.driveFileId, f);
    return m;
  }, [files]);

  // Set of known parent IDs for O(1) root-folder check
  const knownFileIds = useMemo(
    () => new Set(files.map((f) => f.driveFileId)),
    [files],
  );

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
      const folder = fileById.get(fId);
      if (!folder) break;
      chain.unshift({ id: folder.driveFileId, name: folder.fileName });
      fId = folder.parentDriveFileId;
    }
    return [...crumbs, ...chain];
  }, [currentFolder, fileById]);

  const accountEmails = useMemo(
    () => [...new Set(files.map((f) => f.accountEmail))],
    [files],
  );

  const filteredFiles = useMemo(() => files.filter((f) => {
    if (accountFilter !== "all" && f.accountEmail !== accountFilter)
      return false;
    const inFolder =
      currentFolder === null
        ? f.parentDriveFileId === null ||
          !knownFileIds.has(f.parentDriveFileId!)
        : f.parentDriveFileId === currentFolder;
    const matchesSearch =
      !search || f.fileName.toLowerCase().includes(search.toLowerCase());
    return inFolder && matchesSearch;
  }), [files, accountFilter, currentFolder, search, knownFileIds]);

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
  const [, startTransition] = useTransition();

  const navigateToFolder = useCallback((file: FileMetadata) => {
    setSelectedIds(new Set());
    startTransition(() => {
      router.push(`/dashboard/files/${file.driveFileId}`);
    });
  }, [router]);

  const navigateToBreadcrumb = useCallback((index: number) => {
    const crumb = breadcrumbs[index];
    setSelectedIds(new Set());
    startTransition(() => {
      if (crumb.id === null) {
        router.push("/dashboard/files");
      } else {
        router.push(`/dashboard/files/${crumb.id}`);
      }
    });
  }, [breadcrumbs, router]);

  // ── Stable callbacks for FileActionMenu ───────────────────
  const onMenuRename = useCallback((file: FileMetadata) => {
    setNewName(file.fileName);
    setRenameDialog(file);
  }, []);

  const onMenuMove = useCallback((filesToMove: FileMetadata[]) => {
    setMoveTargetId(null);
    setMoveFolderSearch("");
    setMoveDialog(filesToMove);
  }, []);

  const onMenuShare = useCallback((file: FileMetadata) => {
    setShareEmail("");
    setShareDialog(file);
  }, []);

  // ── CRUD handlers (order matters — handleDownload used by handleOpenFile) ──
  const handleTrash = useCallback(async (file: FileMetadata) => {
    try {
      await trashFile(file);
      toast.success("Moved to trash");
      refreshFiles();
    } catch (err) {
      toast.error("Failed to trash file", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [trashFile, refreshFiles]);

  const handleDownload = useCallback(async (file: FileMetadata) => {
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
  }, [getDownloadUrl]);

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

  const handleOpenFile = useCallback(async (file: FileMetadata) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      navigateToFolder(file);
      return;
    }
    // Spreadsheets → open directly in Google Sheets
    if (isSpreadsheet(file.mimeType)) {
      try {
        const url = await openFile(file);
        window.open(url, "_blank", "noopener");
      } catch (err) {
        toast.error("Failed to open spreadsheet", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
      return;
    }
    // Docs/Presentations/Drawings → export as PDF for inline preview
    if (driveService.PREVIEWABLE_WORKSPACE_TYPES.has(file.mimeType ?? "")) {
      setPreviewFile(file);
      setPreviewBlobUrl(null);
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const blobUrl = await getExportBlobUrl(file);
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
    // Other Google Workspace files → open in Google
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
    // Images and PDFs → blob preview
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
  }, [navigateToFolder, openFile, getExportBlobUrl, getPreviewBlobUrl, handleDownload]);

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
      const targetFolder = fileById.get(moveTargetId);
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

      const file = fileById.get(fileId);
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
    [fileById, moveFile, refreshFiles],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedFile(null);
    setDragOverFolder(null);
  }, []);

  // ── Open in Google (for preview dialog) ───────────────────
  const handleOpenInGoogle = useCallback(
    async (file: FileMetadata) => {
      try {
        const url = await openFile(file);
        window.open(url, "_blank", "noopener");
      } catch {
        toast.error("Failed to open in Google");
      }
    },
    [openFile],
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <FilesHeader
        breadcrumbs={breadcrumbs}
        onNavigateBreadcrumb={navigateToBreadcrumb}
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortByChange={(v) => setSortBy(v)}
        sortDir={sortDir}
        onSortDirToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        viewMode={viewMode}
        onViewModeToggle={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
        onRefresh={refreshFiles}
        onNewFolder={() => {
          setFolderName("");
          setNewFolderDialog(true);
        }}
        onUpload={handleUpload}
      />

      <AccountFilterTabs
        accountEmails={accountEmails}
        accountFilter={accountFilter}
        onFilterChange={setAccountFilter}
      />

      <UploadProgressBar uploading={uploading} uploadProgress={uploadProgress} />

      <MultiSelectBar
        count={selectedIds.size}
        onBulkMove={handleBulkMove}
        onBulkTrash={handleBulkTrash}
        onDeselectAll={deselectAll}
      />

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
                {search ? "No files match your search" : "This folder is empty"}
              </p>
              <p className="text-sm mt-1">Drag & drop files here or click Upload</p>
            </div>
          ) : viewMode === "list" ? (
            <FileListView
              files={sortedFiles}
              selectedIds={selectedIds}
              dragOverFolder={dragOverFolder}
              draggedFile={draggedFile}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              onOpenFile={handleOpenFile}
              onDragStart={handleDragStartInternal}
              onDragEnd={handleDragEnd}
              onFolderDragOver={handleFolderDragOver}
              onFolderDragLeave={handleFolderDragLeave}
              onFolderDrop={handleFolderDrop}
              onRename={onMenuRename}
              onMove={onMenuMove}
              onDownload={handleDownload}
              onShare={onMenuShare}
              onTrash={handleTrash}
            />
          ) : (
            <FileGridView
              files={sortedFiles}
              selectedIds={selectedIds}
              dragOverFolder={dragOverFolder}
              draggedFile={draggedFile}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              onOpenFile={handleOpenFile}
              onDragStart={handleDragStartInternal}
              onDragEnd={handleDragEnd}
              onFolderDragOver={handleFolderDragOver}
              onFolderDragLeave={handleFolderDragLeave}
              onFolderDrop={handleFolderDrop}
              onRename={onMenuRename}
              onMove={onMenuMove}
              onDownload={handleDownload}
              onShare={onMenuShare}
              onTrash={handleTrash}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs ──────────────────────────────────────── */}
      <RenameDialog
        file={renameDialog}
        name={newName}
        onNameChange={setNewName}
        onRename={handleRename}
        onClose={() => setRenameDialog(null)}
      />

      <NewFolderDialog
        open={newFolderDialog}
        folderName={folderName}
        onFolderNameChange={setFolderName}
        onCreate={handleCreateFolder}
        onClose={() => setNewFolderDialog(false)}
      />

      <MoveToFolderDialog
        files={moveDialog}
        targetId={moveTargetId}
        onTargetChange={setMoveTargetId}
        folderSearch={moveFolderSearch}
        onFolderSearchChange={setMoveFolderSearch}
        filteredFolders={filteredMoveFolders}
        onMove={handleMove}
        onClose={() => {
          setMoveDialog(null);
          setMoveTargetId(null);
          setMoveFolderSearch("");
        }}
      />

      <ShareDialog
        file={shareDialog}
        email={shareEmail}
        onEmailChange={setShareEmail}
        loading={shareLoading}
        onShareLink={handleShareLink}
        onShareEmail={handleShareEmail}
        onClose={() => {
          setShareDialog(null);
          setShareEmail("");
        }}
      />

      <FilePreviewDialog
        file={previewFile}
        blobUrl={previewBlobUrl}
        loading={previewLoading}
        error={previewError}
        onClose={closePreview}
        onRetry={handleOpenFile}
        onOpenInGoogle={handleOpenInGoogle}
      />
    </div>
  );
}
